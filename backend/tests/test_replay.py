"""Tests for drawing replay recording and retrieval."""

from __future__ import annotations

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
from app.models.drawing import Drawing  # noqa: F401
from app.models.room import GAME_PHASE_ROUND_ACTIVE
from app.models.user import User
from app.services.canvas import (
    apply_canvas_cleared,
    apply_shape_created,
    apply_shape_deleted,
    apply_shape_preview,
    apply_undo,
)
from app.services.drawings import publish_drawing
from app.services.game import set_player_ready, start_game, utcnow
from app.services.replay import ReplayError, get_drawing_replay, get_game_replay
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


def _shape(user_id: uuid.UUID, *, shape_id: str = "s1") -> dict:
    return {
        "id": shape_id,
        "tool": "pencil",
        "stroke": "#000000",
        "fill": "none",
        "strokeWidth": 5,
        "transform": "",
        "geometry": {"kind": "pencil", "d": "M 10 10 L 40 40"},
        "createdBy": str(user_id),
        "createdAt": 1,
    }


def _start_active_round(db: Session):
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, room.code, guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    session = room.game_session
    assert session is not None
    # Force into ROUND_ACTIVE with a drawing allocated.
    session.phase = GAME_PHASE_ROUND_ACTIVE
    session.round_started_at = utcnow() - timedelta(seconds=2)
    session.drawer_user_id = host.id
    from app.services.drawings import create_in_progress_drawing

    drawing = create_in_progress_drawing(
        db,
        room=room,
        session=session,
        author_id=host.id,
        word="apple",
    )
    db.commit()
    return room, session, host, guest, drawing


def test_committed_ops_append_to_timeline(db: Session) -> None:
    room, session, host, _guest, drawing = _start_active_round(db)

    apply_shape_created(db, room.code, host.id, _shape(host.id, shape_id="a"))
    apply_shape_created(db, room.code, host.id, _shape(host.id, shape_id="b"))
    apply_shape_deleted(db, room.code, host.id, "a")
    apply_undo(db, room.code, host.id)

    db.refresh(drawing)
    assert isinstance(drawing.timeline, list)
    types = [e["type"] for e in drawing.timeline]
    assert types == [
        "shape.created",
        "shape.created",
        "shape.deleted",
        "undo",
    ]
    assert all(isinstance(e["t"], int) and e["t"] >= 0 for e in drawing.timeline)
    assert drawing.timeline[0]["tool"] == "pencil"
    assert drawing.timeline[2]["tool"] == "eraser"


def test_ephemeral_preview_not_recorded(db: Session) -> None:
    room, session, host, _guest, drawing = _start_active_round(db)

    apply_shape_preview(db, room.code, host.id, _shape(host.id, shape_id="preview"))
    db.refresh(drawing)
    assert drawing.timeline == []


def test_publish_preserves_timeline_and_game_replay(db: Session) -> None:
    room, session, host, _guest, drawing = _start_active_round(db)
    apply_shape_created(db, room.code, host.id, _shape(host.id))
    apply_canvas_cleared(db, room.code, host.id)

    published = publish_drawing(db, drawing.id, session=session)
    db.commit()
    assert published is not None
    assert published.status == "published"
    assert len(published.timeline or []) == 2

    replay = get_drawing_replay(db, drawing.id)
    assert replay.meta.word == "apple"
    assert replay.meta.event_count == 2
    assert replay.events[0].type == "shape.created"
    assert replay.events[1].type == "canvas.cleared"

    game = get_game_replay(db, session.id)
    assert game.game_id == session.id
    assert len(game.drawings) == 1
    assert game.drawings[0].meta.drawing_id == drawing.id


def test_game_replay_unknown_session(db: Session) -> None:
    with pytest.raises(ReplayError) as exc:
        get_game_replay(db, uuid.uuid4())
    assert exc.value.status_code == 404


def test_drawing_replay_not_ready_while_in_progress(db: Session) -> None:
    _room, _session, host, _guest, drawing = _start_active_round(db)
    apply_shape_created(db, _room.code, host.id, _shape(host.id))
    with pytest.raises(ReplayError) as exc:
        get_drawing_replay(db, drawing.id)
    assert exc.value.status_code == 409
