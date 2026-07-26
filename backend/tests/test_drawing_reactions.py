"""Tests for unified drawing reactions + gallery publish pipeline."""

from __future__ import annotations

import json
import os
import uuid
from datetime import timedelta

os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session")
os.environ.setdefault("JWT_SECRET", "test-jwt")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.canvas import CanvasState  # noqa: F401
from app.models.drawing import (  # noqa: F401
    DRAWING_STATUS_PUBLISHED,
    Drawing,
    DrawingReaction,
)
from app.models.room import (  # noqa: F401
    GAME_PHASE_WORD_SELECTION,
    GameSession,
    Room,
)
from app.models.user import User
from app.services.drawings import (
    publish_drawing,
    set_gallery_reaction,
    set_reaction,
)
from app.services.game import (
    advance_due_session,
    select_word,
    set_player_ready,
    start_game,
    utcnow,
)
from app.services.room import create_room, join_room


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def _user(db: Session, name: str) -> User:
    user = User(
        id=uuid.uuid4(),
        provider="guest",
        provider_id=str(uuid.uuid4()),
        email=None,
        name=name,
        avatar_url=None,
    )
    db.add(user)
    db.flush()
    return user


def _force_deadline(db: Session, room) -> object:
    db.refresh(room)
    sess = room.game_session
    assert sess is not None
    sess.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    return sess.id


def test_live_reaction_then_publish_credits_profile(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)

    # COUNTDOWN → WORD_SELECTION
    session_id = _force_deadline(db, room)
    advance_due_session(db, session_id)
    db.refresh(room)
    session = room.game_session
    assert session is not None
    assert session.phase == GAME_PHASE_WORD_SELECTION
    assert session.drawer_user_id is not None

    drawer_id = session.drawer_user_id
    guesser = guest if guest.id != drawer_id else host
    drawer = db.get(User, drawer_id)
    assert drawer is not None

    choices = json.loads(session.word_choices_json or "[]")
    assert choices
    select_word(db, room.code, drawer_id, word=choices[0])
    db.refresh(room)
    session = room.game_session
    assert session is not None
    assert session.current_drawing_id is not None
    drawing_id = session.current_drawing_id

    canvas = CanvasState(
        session_id=session.id,
        room_id=room.id,
        current_turn=session.current_turn,
        shapes=[
            {
                "id": "s1",
                "tool": "rectangle",
                "stroke": "#000",
                "fill": "none",
                "strokeWidth": 2,
                "transform": "",
                "geometry": {
                    "kind": "rectangle",
                    "x": 1,
                    "y": 2,
                    "width": 10,
                    "height": 10,
                },
                "createdBy": str(drawer_id),
                "createdAt": 1,
            }
        ],
    )
    db.add(canvas)
    db.commit()

    likes_before = int(drawer.likes_received or 0)
    dislikes_before = int(drawer.dislikes_received or 0)

    state = set_reaction(
        db,
        drawing_id=drawing_id,
        user_id=guesser.id,
        reaction="like",
        require_room_member=room,
        live_phases_only=True,
    )
    db.commit()
    assert state.likes == 1
    assert state.my_reaction == "like"

    db.refresh(drawer)
    assert int(drawer.likes_received or 0) == likes_before
    assert int(drawer.dislikes_received or 0) == dislikes_before

    published = publish_drawing(db, drawing_id, session=session)
    db.commit()
    assert published is not None
    assert published.status == DRAWING_STATUS_PUBLISHED
    assert published.document is not None
    assert len(published.document.get("shapes") or []) == 1

    db.refresh(drawer)
    assert int(drawer.likes_received or 0) == likes_before + 1

    set_gallery_reaction(
        db, drawing_id=drawing_id, user_id=guesser.id, reaction="dislike"
    )
    db.refresh(drawer)
    assert int(drawer.likes_received or 0) == likes_before
    assert int(drawer.dislikes_received or 0) == dislikes_before + 1


def test_one_reaction_per_user(db: Session) -> None:
    author = _user(db, "Artist")
    voter = _user(db, "Voter")
    drawing = Drawing(
        author_id=author.id,
        room_id=None,
        session_id=uuid.uuid4(),
        turn_number=1,
        word="cat",
        document={
            "version": 1,
            "viewBox": {"width": 800, "height": 800},
            "shapes": [],
            "exportedAt": 1,
        },
        status=DRAWING_STATUS_PUBLISHED,
        likes_count=0,
        dislikes_count=0,
    )
    db.add(drawing)
    db.commit()

    set_gallery_reaction(db, drawing_id=drawing.id, user_id=voter.id, reaction="like")
    set_gallery_reaction(db, drawing_id=drawing.id, user_id=voter.id, reaction="like")
    db.refresh(drawing)
    assert drawing.likes_count == 1
    assert drawing.dislikes_count == 0

    set_gallery_reaction(db, drawing_id=drawing.id, user_id=voter.id, reaction=None)
    db.refresh(drawing)
    assert drawing.likes_count == 0
