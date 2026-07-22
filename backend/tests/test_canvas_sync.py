"""Tests for collaborative canvas authz, snapshot, and round-clear."""

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
from app.models.canvas import CanvasState  # noqa: F401 — register metadata
from app.models.room import GAME_PHASE_ROUND_ACTIVE, GAME_PHASE_WORD_SELECTION
from app.models.user import User
from app.schemas.canvas import parse_shape
from app.services.canvas import (
    CanvasError,
    apply_canvas_cleared,
    apply_redo,
    apply_shape_created,
    apply_shape_deleted,
    apply_shape_preview,
    apply_shape_updated,
    apply_undo,
    clear_canvas_for_room_code,
    get_canvas_snapshot,
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


def _ready_and_start(db: Session, room_code: str, host_id, users) -> None:
    for user in users:
        set_player_ready(db, room_code, user.id, ready=True)
    start_game(db, room_code, host_id)


def _force_deadline(db: Session, room) -> object:
    db.refresh(room)
    sess = room.game_session
    assert sess is not None
    sess.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    return sess.id


def _enter_round_active(db: Session, room):
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    session = room.game_session
    choices = json.loads(session.word_choices_json)
    pick = choices[0]
    drawer_id = session.drawer_user_id
    mutation = select_word(db, room.code, drawer_id, word=pick)
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    db.refresh(room)
    return room.game_session, drawer_id


def _rect_shape(*, shape_id: str, created_by: str) -> dict:
    return {
        "id": shape_id,
        "tool": "rectangle",
        "stroke": "#2C2C2C",
        "fill": "none",
        "strokeWidth": 2,
        "transform": "",
        "geometry": {"kind": "rectangle", "x": 10, "y": 20, "width": 40, "height": 30},
        "createdBy": created_by,
        "createdAt": 1_700_000_000_000,
    }


def test_non_drawer_rejected_for_mutations(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    session, drawer_id = _enter_round_active(db, room)
    spectator_id = guest.id if drawer_id == host.id else host.id
    shape = _rect_shape(shape_id="s1", created_by=str(spectator_id))

    with pytest.raises(CanvasError) as exc:
        apply_shape_created(db, room.code, spectator_id, shape)
    assert exc.value.code == "NOT_DRAWER"

    with pytest.raises(CanvasError) as exc:
        apply_shape_updated(db, room.code, spectator_id, shape)
    assert exc.value.code == "NOT_DRAWER"

    with pytest.raises(CanvasError) as exc:
        apply_shape_deleted(db, room.code, spectator_id, "s1")
    assert exc.value.code == "NOT_DRAWER"

    with pytest.raises(CanvasError) as exc:
        apply_canvas_cleared(db, room.code, spectator_id)
    assert exc.value.code == "NOT_DRAWER"

    with pytest.raises(CanvasError) as exc:
        apply_undo(db, room.code, spectator_id)
    assert exc.value.code == "NOT_DRAWER"

    with pytest.raises(CanvasError) as exc:
        apply_redo(db, room.code, spectator_id)
    assert exc.value.code == "NOT_DRAWER"

    assert session.phase == GAME_PHASE_ROUND_ACTIVE


def test_drawer_ops_and_snapshot_for_joiner(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    session, drawer_id = _enter_round_active(db, room)
    spectator_id = guest.id if drawer_id == host.id else host.id

    shape = _rect_shape(shape_id="rect-1", created_by=str(drawer_id))
    created = apply_shape_created(db, room.code, drawer_id, shape)
    assert created.event == "SHAPE_CREATED"
    assert created.payload["shape"]["id"] == "rect-1"

    updated = dict(shape)
    updated["geometry"] = {
        "kind": "rectangle",
        "x": 15,
        "y": 25,
        "width": 50,
        "height": 35,
    }
    apply_shape_updated(db, room.code, drawer_id, updated)

    snap = get_canvas_snapshot(db, room.code, user_id=spectator_id)
    assert snap["session_id"] == str(session.id)
    assert snap["can_draw"] is False
    assert len(snap["shapes"]) == 1
    assert snap["shapes"][0]["id"] == "rect-1"
    assert snap["shapes"][0]["geometry"]["width"] == 50
    assert snap["op_seq"] >= 1

    drawer_snap = get_canvas_snapshot(db, room.code, user_id=drawer_id)
    assert drawer_snap["can_draw"] is True


def test_preview_broadcast_does_not_persist(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    _, drawer_id = _enter_round_active(db, room)
    shape = _rect_shape(shape_id="draft-1", created_by=str(drawer_id))
    preview = apply_shape_preview(db, room.code, drawer_id, shape)

    assert preview.event == "SHAPE_UPDATED"
    assert preview.payload["ephemeral"] is True
    assert "op_seq" not in preview.payload
    assert get_canvas_snapshot(db, room.code)["shapes"] == []


def test_committed_edit_is_undoable(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    _, drawer_id = _enter_round_active(db, room)
    original = _rect_shape(shape_id="edit-1", created_by=str(drawer_id))
    apply_shape_created(db, room.code, drawer_id, original)
    edited = dict(original)
    edited["geometry"] = {**original["geometry"], "width": 80}
    apply_shape_updated(db, room.code, drawer_id, edited)

    undone = apply_undo(db, room.code, drawer_id)
    assert undone.payload["shapes"][0]["geometry"]["width"] == 40


def test_fill_shape_accepts_zero_stroke_width() -> None:
    shape = _rect_shape(shape_id="fill-1", created_by=str(uuid.uuid4()))
    shape.update(
        {
            "tool": "fill",
            "fill": "#ffffff",
            "strokeWidth": 0,
            "geometry": {"kind": "fill", "d": "M0 0H10V10Z"},
        }
    )
    assert parse_shape(shape).strokeWidth == 0


def test_clear_on_round_start_wipes_shapes(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    _, drawer_id = _enter_round_active(db, room)
    shape = _rect_shape(shape_id="keep-me", created_by=str(drawer_id))
    apply_shape_created(db, room.code, drawer_id, shape)

    before = get_canvas_snapshot(db, room.code)
    assert len(before["shapes"]) == 1

    # Lifecycle CANVAS_CLEAR path — wipe server canvas for new round/drawer.
    cleared = clear_canvas_for_room_code(db, room.code)
    assert cleared is not None
    assert cleared["shapes"] == []
    assert cleared["reason"] == "round_started"

    after = get_canvas_snapshot(db, room.code)
    assert after["shapes"] == []
    assert after["op_seq"] > before["op_seq"]


def test_drawer_clear_undo_redo(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    _, drawer_id = _enter_round_active(db, room)
    shape = _rect_shape(shape_id="u1", created_by=str(drawer_id))
    apply_shape_created(db, room.code, drawer_id, shape)

    undo = apply_undo(db, room.code, drawer_id)
    assert undo.event == "UNDO"
    assert undo.payload["shapes"] == []

    redo = apply_redo(db, room.code, drawer_id)
    assert redo.event == "REDO"
    assert len(redo.payload["shapes"]) == 1

    apply_canvas_cleared(db, room.code, drawer_id)
    snap = get_canvas_snapshot(db, room.code)
    assert snap["shapes"] == []
