"""End-to-end playable path: lobby → draw → guess → scores → lobby."""

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
from app.models.room import (
    GAME_PHASE_GAME_FINISHED,
    GAME_PHASE_LOBBY,
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GAME_PHASE_WORD_SELECTION,
    ROOM_STATUS_WAITING,
)
from app.models.user import User
from app.schemas.room import RoomResponse
from app.services.canvas import (
    apply_shape_created,
    apply_undo,
    clear_canvas_for_room_code,
    get_canvas_snapshot,
)
from app.services.game import (
    advance_due_session,
    select_word,
    set_player_ready,
    start_game,
    submit_chat,
    update_game_settings,
    utcnow,
)
from app.services.room import create_room, join_room, leave_room


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


def _shape(drawer_id: object, shape_id: str = "s1") -> dict:
    return {
        "id": shape_id,
        "tool": "pencil",
        "stroke": "#2C2C2C",
        "fill": "none",
        "strokeWidth": 5,
        "transform": "",
        "geometry": {"kind": "pencil", "points": [{"x": 1, "y": 2}, {"x": 3, "y": 4}]},
        "createdBy": str(drawer_id),
        "createdAt": 1,
    }


def test_full_playable_path_with_draw_guess_and_return_lobby(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )

    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    assert room.game_session is not None
    assert room.game_session.phase != GAME_PHASE_LOBBY

    # Countdown → word selection
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    session = room.game_session
    choices = json.loads(session.word_choices_json)
    drawer_id = session.drawer_user_id
    guesser_id = guest.id if drawer_id == host.id else host.id
    word = choices[0]

    # Public secrecy while choosing
    public = RoomResponse.from_room(room)
    assert public.game.word_choices is None
    assert public.game.secret_word is None
    drawer_view = RoomResponse.from_room(room, viewer_id=drawer_id)
    assert drawer_view.game.word_choices == choices

    select_word(db, room.code, drawer_id, word=word)
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE

    # Drawing sync
    apply_shape_created(db, room.code, drawer_id, _shape(drawer_id))
    snap = get_canvas_snapshot(db, room.code, user_id=guesser_id)
    assert len(snap["shapes"]) == 1
    assert snap["can_draw"] is False
    drawer_snap = get_canvas_snapshot(db, room.code, user_id=drawer_id)
    assert drawer_snap["can_draw"] is True

    apply_undo(db, room.code, drawer_id)
    snap = get_canvas_snapshot(db, room.code, user_id=guesser_id)
    assert snap["shapes"] == []

    apply_shape_created(db, room.code, drawer_id, _shape(drawer_id, "s2"))

    # Correct guess ends the turn when everyone else has guessed
    mutation = submit_chat(db, room.code, guesser_id, text=word)
    assert mutation.phase == GAME_PHASE_ROUND_END
    assert mutation.round_summary is not None
    assert mutation.round_summary["word"] == word
    db.refresh(room)
    scores = {p.user_id: p.score for p in room.game_session.players}
    assert scores[guesser_id] > 0
    assert scores[drawer_id] > 0

    # Next turn (second player) then finish game (1 round × 2 players)
    session_id = _force_deadline(db, room)
    mut = advance_due_session(db, session_id)
    assert mut is not None
    assert mut.phase == GAME_PHASE_WORD_SELECTION
    # Canvas cleared for next drawer
    cleared = clear_canvas_for_room_code(db, room.code)
    assert cleared is None or cleared.get("shapes") == []

    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_ACTIVE
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_GAME_FINISHED

    finished = RoomResponse.from_room(room)
    assert finished.game.winner_id is not None
    assert finished.game.scores

    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_LOBBY
    db.refresh(room)
    assert room.status == ROOM_STATUS_WAITING
    assert room.game_session.phase == GAME_PHASE_LOBBY
    assert all(not p.is_ready for p in room.players)


def test_midgame_join_receives_canvas_and_waits(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)

    session_id = _force_deadline(db, room)
    advance_due_session(db, session_id)
    db.refresh(room)
    session = room.game_session
    word = json.loads(session.word_choices_json)[0]
    select_word(db, room.code, session.drawer_user_id, word=word)
    apply_shape_created(
        db, room.code, session.drawer_user_id, _shape(session.drawer_user_id)
    )

    join_room(db, code=room.code, user_id=late.id)
    db.refresh(room)
    snap = RoomResponse.from_room(room, viewer_id=late.id)
    assert late.id in snap.waiting_player_ids
    canvas = get_canvas_snapshot(db, room.code, user_id=late.id)
    assert len(canvas["shapes"]) == 1
    assert canvas["can_draw"] is False


def test_host_migration_preserves_active_round(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    for user in (host, guest, third):
        set_player_ready(db, room.code, user.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    session_id = _force_deadline(db, room)
    advance_due_session(db, session_id)
    db.refresh(room)
    word = json.loads(room.game_session.word_choices_json)[0]
    select_word(db, room.code, room.game_session.drawer_user_id, word=word)
    db.refresh(room)

    was_drawer = room.game_session.drawer_user_id == host.id
    leave_room(db, code=room.code, user_id=host.id)
    db.refresh(room)

    assert room.host_id != host.id
    assert room.host_id in {guest.id, third.id}
    # Still enough players for the game to continue.
    assert room.game_session.phase != GAME_PHASE_LOBBY
    if was_drawer:
        assert room.game_session.phase == GAME_PHASE_ROUND_END
    else:
        assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE
