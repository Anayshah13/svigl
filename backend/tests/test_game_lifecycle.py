"""Focused unit tests for the multiplayer game lifecycle engine."""

from __future__ import annotations

import os
import uuid
from datetime import timedelta, timezone

# Configure settings before importing app modules.
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
from app.models.room import (
    GAME_PHASE_COUNTDOWN,
    GAME_PHASE_LOBBY,
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GAME_PHASE_WORD_SELECTION,
    ROOM_STATUS_PLAYING,
    ROOM_STATUS_WAITING,
)
from app.models.user import User
from app.schemas.room import RoomResponse
from app.services.game import (
    GameError,
    advance_due_session,
    handle_player_departure,
    set_player_ready,
    start_game,
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


def test_create_room_initializes_settings_and_session(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    assert room.game_settings is not None
    assert room.game_settings.total_rounds == 3
    assert room.game_settings.round_duration_seconds == 60
    assert room.game_session is not None
    assert room.game_session.phase == GAME_PHASE_LOBBY
    snapshot = RoomResponse.from_room(room)
    assert snapshot.can_start is False
    assert snapshot.settings.total_rounds == 3


def test_ready_settings_start_and_countdown(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)

    update_game_settings(
        db,
        room.code,
        host.id,
        total_rounds=2,
        round_duration_seconds=30,
    )
    db.refresh(room)
    assert room.game_settings.total_rounds == 2
    assert all(not p.is_ready for p in room.players)

    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    db.refresh(room)
    assert RoomResponse.from_room(room).can_start is True

    mutation = start_game(db, room.code, host.id)
    db.refresh(room)
    assert mutation.phase == GAME_PHASE_COUNTDOWN
    assert "GAME_STARTED" in mutation.events
    assert "COUNTDOWN_STARTED" in mutation.events
    assert room.status == ROOM_STATUS_PLAYING
    assert room.game_session is not None
    assert room.game_session.deadline_at is not None
    assert len(room.game_session.players) == 2


def test_advance_countdown_to_word_selection(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    assert room.game_session is not None
    room.game_session.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()

    mutation = advance_due_session(db, room.game_session.id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    assert "WORD_CHOICES_OFFERED" in mutation.events
    assert mutation.private_drawer is not None
    assert mutation.private_drawer.word_choices is not None
    assert len(mutation.private_drawer.word_choices) == 3


def _force_deadline(db: Session, room) -> object:
    db.refresh(room)
    sess = room.game_session
    assert sess is not None
    sess.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    return sess.id


def _advance_to_round_active(db: Session, room) -> None:
    """Countdown → word selection → round active (auto-pick word)."""
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_ACTIVE


def test_midgame_join_waits_then_enters_next_drawing(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    # Enter first drawing before the late player joins.
    _advance_to_round_active(db, room)

    change = join_room(db, code=room.code, user_id=late.id)
    assert change.joined_as_waiting is True
    db.refresh(room)
    assert late.id in RoomResponse.from_room(room).waiting_player_ids
    assert late.id not in {p.user_id for p in room.game_session.players}

    # Finish the in-progress drawing -> admit at next WORD_SELECTION boundary.
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert late.id in {p.user_id for p in room.game_session.players if p.is_active}
    assert late.id not in RoomResponse.from_room(room).waiting_player_ids
    late_player = next(p for p in room.game_session.players if p.user_id == late.id)
    assert late_player.draw_target == 2  # remaining rounds at admit (round 1)
    assert late_player.draws_done == 0


def test_late_join_preserves_next_drawer_order(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)
    session = room.game_session
    assert session is not None
    frozen = sorted(session.players, key=lambda item: item.rotation_index)
    first_drawer = frozen[0].user_id
    expected_second = frozen[1].user_id
    session.drawer_user_id = first_drawer
    _advance_to_round_active(db, room)

    join_room(db, code=room.code, user_id=late.id)
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    # Growing the roster must not remap the already-expected next seat.
    assert room.game_session.drawer_user_id == expected_second
    assert late.id in {p.user_id for p in room.game_session.players if p.is_active}


def test_last_round_late_join_gets_bounded_draw_target(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=3, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session = room.game_session
    assert session is not None
    # Simulate last displayed round with both originals still needing one draw.
    session.current_round = 3
    for player in session.players:
        player.draws_done = 2
        player.draw_target = 3
    session.phase = GAME_PHASE_ROUND_ACTIVE
    session.deadline_at = utcnow() + timedelta(seconds=30)
    session.secret_word = "apple"
    db.commit()

    join_room(db, code=room.code, user_id=late.id)
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    late_player = next(p for p in room.game_session.players if p.user_id == late.id)
    assert late_player.draw_target == 1
    assert late_player.draws_done == 0


def test_multiple_waiters_admitted_same_boundary(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late_a = _user(db, "LateA")
    late_b = _user(db, "LateB")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    _advance_to_round_active(db, room)
    join_room(db, code=room.code, user_id=late_a.id)
    join_room(db, code=room.code, user_id=late_b.id)

    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    active_ids = {p.user_id for p in room.game_session.players if p.is_active}
    assert late_a.id in active_ids
    assert late_b.id in active_ids
    targets = {
        p.user_id: p.draw_target
        for p in room.game_session.players
        if p.user_id in {late_a.id, late_b.id}
    }
    assert targets[late_a.id] == targets[late_b.id] == 2


def test_countdown_join_admitted_before_first_drawing(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    assert room.game_session is not None
    assert room.game_session.phase == GAME_PHASE_COUNTDOWN

    join_room(db, code=room.code, user_id=late.id)
    assert late.id not in {p.user_id for p in room.game_session.players}

    mutation = advance_due_session(db, _force_deadline(db, room))
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    late_player = next(p for p in room.game_session.players if p.user_id == late.id)
    assert late_player.is_active is True
    assert late_player.draw_target == 2
    assert late.id not in RoomResponse.from_room(room).waiting_player_ids


def test_round_end_join_admitted_at_next_drawing(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    _advance_to_round_active(db, room)
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    db.refresh(room)

    join_room(db, code=room.code, user_id=late.id)
    assert late.id not in {p.user_id for p in room.game_session.players}

    mutation = advance_due_session(db, _force_deadline(db, room))
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert late.id in {p.user_id for p in room.game_session.players if p.is_active}
    assert room.game_session.current_turn == 1


def test_word_selection_departure_does_not_credit_draw(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    drawer_id = room.game_session.drawer_user_id
    assert drawer_id is not None
    handle_player_departure(db, room, drawer_id)
    db.commit()
    db.refresh(room)
    departed = next(p for p in room.game_session.players if p.user_id == drawer_id)
    assert departed.draws_done == 0
    assert room.game_session.phase == GAME_PHASE_ROUND_END


def test_round_active_timeout_credits_one_draw(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    _advance_to_round_active(db, room)
    db.refresh(room)
    drawer_id = room.game_session.drawer_user_id
    assert drawer_id is not None
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    db.refresh(room)
    drawer = next(p for p in room.game_session.players if p.user_id == drawer_id)
    assert drawer.draws_done == 1


def test_round_active_departure_credits_with_roster_remaining(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    _advance_to_round_active(db, room)
    db.refresh(room)
    drawer_id = room.game_session.drawer_user_id
    assert drawer_id is not None
    handle_player_departure(db, room, drawer_id)
    db.commit()
    db.refresh(room)
    departed = next(p for p in room.game_session.players if p.user_id == drawer_id)
    assert departed.draws_done == 1
    assert room.game_session.phase == GAME_PHASE_ROUND_END


def test_two_player_drawer_leave_credits_before_lobby(db: Session) -> None:
    """Drawer leave that collapses the room must still credit the ROUND_ACTIVE seat."""
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    _advance_to_round_active(db, room)
    db.refresh(room)
    drawer_id = room.game_session.drawer_user_id
    assert drawer_id is not None
    drawer_user = db.get(User, drawer_id)
    assert drawer_user is not None
    drawings_before = int(drawer_user.drawings_done or 0)

    mutation = handle_player_departure(db, room, drawer_id)
    db.commit()
    db.refresh(room)
    assert mutation is not None
    assert mutation.stop_timer is True
    assert room.game_session.phase == GAME_PHASE_LOBBY
    departed = next(p for p in room.game_session.players if p.user_id == drawer_id)
    assert departed.draws_done == 1
    db.refresh(drawer_user)
    assert int(drawer_user.drawings_done or 0) == drawings_before + 1


def test_inactive_player_skipped_and_ignored_for_end(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)
    session = room.game_session
    assert session is not None
    frozen = sorted(session.players, key=lambda item: item.rotation_index)
    # Mark the middle seat inactive with unmet quota — must be skipped.
    middle = frozen[1]
    middle.is_active = False
    session.drawer_user_id = frozen[0].user_id
    session.phase = GAME_PHASE_ROUND_END
    session.deadline_at = utcnow() - timedelta(seconds=1)
    frozen[0].draws_done = 1
    frozen[0].draw_target = 1
    middle.draws_done = 0
    middle.draw_target = 1
    frozen[2].draws_done = 0
    frozen[2].draw_target = 1
    db.commit()

    mutation = advance_due_session(db, session.id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert room.game_session.drawer_user_id == frozen[2].user_id


def test_settings_update_keeps_ready(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    update_game_settings(
        db, room.code, host.id, total_rounds=5, round_duration_seconds=45
    )
    db.refresh(room)
    assert all(player.is_ready for player in room.players)
    assert RoomResponse.from_room(room).can_start is True


def test_round_active_deadline_is_full_duration(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=1, round_duration_seconds=15
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session = room.game_session
    # Countdown overdue → word selection
    session.deadline_at = utcnow() - timedelta(seconds=3)
    db.commit()
    assert advance_due_session(db, session.id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    session = room.game_session
    # Word selection overdue → round active with full duration
    session.deadline_at = utcnow() - timedelta(seconds=3)
    db.commit()
    before = utcnow()
    mutation = advance_due_session(db, session.id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    db.refresh(room)
    deadline = room.game_session.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    remaining = (deadline - before).total_seconds()
    # Full 15s from wall clock, not 15-3 chained from the old boundary.
    assert 14.0 <= remaining <= 15.5


def test_drawer_departure_ends_round(db: Session) -> None:
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
    session = room.game_session
    assert session is not None
    session.phase = GAME_PHASE_ROUND_ACTIVE
    session.deadline_at = utcnow() + timedelta(seconds=60)
    drawer_id = session.drawer_user_id
    assert drawer_id is not None
    db.commit()

    mutation = handle_player_departure(db, room, drawer_id)
    db.commit()
    db.refresh(room)
    assert mutation is not None
    assert "ROUND_ENDED" in mutation.events
    assert room.game_session.phase == GAME_PHASE_ROUND_END


def test_fewer_than_two_active_returns_lobby(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)

    change = leave_room(db, code=room.code, user_id=guest.id)
    assert change.room is not None
    assert change.game_mutation is not None
    assert change.game_mutation.stop_timer is True
    assert change.room.status == ROOM_STATUS_WAITING
    assert change.room.game_session.phase == GAME_PHASE_LOBBY


def test_non_host_cannot_start(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    with pytest.raises(GameError) as exc:
        start_game(db, room.code, guest.id)
    assert exc.value.code == "NOT_HOST"


def test_settings_validation(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    with pytest.raises(GameError) as exc:
        update_game_settings(
            db,
            room.code,
            host.id,
            total_rounds=2,
            round_duration_seconds=10,
        )
    assert exc.value.status_code == 422


def _ready_and_start(db: Session, room_code: str, host_id, users) -> None:
    for user in users:
        set_player_ready(db, room_code, user.id, ready=True)
    start_game(db, room_code, host_id)


def test_unready_blocks_start(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=False)
    db.refresh(room)
    assert RoomResponse.from_room(room).can_start is False
    with pytest.raises(GameError):
        start_game(db, room.code, host.id)


@pytest.mark.parametrize("player_count", [2, 4, 8])
def test_multiplayer_start_and_rotation(db: Session, player_count: int) -> None:
    from app.services.game import _next_drawer

    host = _user(db, "Host")
    users = [host]
    room = create_room(db, host_id=host.id, max_players=8)
    for index in range(player_count - 1):
        guest = _user(db, f"Guest{index}")
        users.append(guest)
        join_room(db, code=room.code, user_id=guest.id)

    # Each original player draws once per round until draw_target is met.
    total_rounds = 2
    update_game_settings(
        db,
        room.code,
        host.id,
        total_rounds=total_rounds,
        round_duration_seconds=30,
    )
    _ready_and_start(db, room.code, host.id, users)
    db.refresh(room)
    session = room.game_session
    assert session is not None
    assert len(session.players) == player_count
    assert session.total_rounds == total_rounds
    assert session.current_round == 1
    assert all(player.draw_target == total_rounds for player in session.players)
    assert all(player.draws_done == 0 for player in session.players)

    frozen = [
        player.user_id
        for player in sorted(session.players, key=lambda item: item.rotation_index)
    ]
    drawers = [session.drawer_user_id]
    # Simulate cursor succession + quota credits across the full match.
    for _ in range(total_rounds * player_count - 1):
        current = next(p for p in session.players if p.user_id == session.drawer_user_id)
        current.draws_done += 1
        nxt = _next_drawer(session)
        assert nxt is not None
        if nxt.rotation_index <= current.rotation_index:
            session.current_round += 1
        session.drawer_user_id = nxt.user_id
        drawers.append(nxt.user_id)
    # Final seat completes everyone's quota.
    current = next(p for p in session.players if p.user_id == session.drawer_user_id)
    current.draws_done += 1
    assert _next_drawer(session) is None
    assert drawers == [
        frozen[index % player_count]
        for index in range(total_rounds * player_count)
    ]
    for player_id in frozen:
        assert drawers.count(player_id) == total_rounds
    assert RoomResponse.from_room(room).game.current_round == min(
        session.current_round, total_rounds
    )


def test_full_game_returns_to_lobby(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    update_game_settings(
        db,
        room.code,
        host.id,
        total_rounds=1,
        round_duration_seconds=30,
    )
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session = room.game_session
    assert session is not None

    # Countdown -> word selection -> first drawer round
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_ACTIVE

    # First turn -> round end
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END

    # Round end -> second player's word selection (1 round × 2 players)
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    assert "WORD_CHOICES_OFFERED" in mutation.events
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_ACTIVE

    # Second turn -> round end
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END

    # Final round end -> finished
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert "GAME_FINISHED" in mutation.events

    # Finished -> lobby
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.stop_timer is True
    db.refresh(room)
    assert room.status == ROOM_STATUS_WAITING
    assert room.game_session.phase == GAME_PHASE_LOBBY
    assert all(not player.is_ready for player in room.players)


def test_drawer_leave_during_round_end_does_not_double_skip(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    update_game_settings(
        db, room.code, host.id, total_rounds=2, round_duration_seconds=30
    )
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)
    session = room.game_session
    assert session is not None
    session.phase = GAME_PHASE_ROUND_END
    session.current_turn = 0
    session.deadline_at = utcnow() + timedelta(seconds=2)
    drawer_id = session.drawer_user_id
    assert drawer_id is not None
    db.commit()

    handle_player_departure(db, room, drawer_id)
    db.commit()
    db.refresh(room)
    session = room.game_session
    assert session.phase == GAME_PHASE_ROUND_END
    assert session.current_turn == 0  # advance_due_session owns the bump

    session.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    mutation = advance_due_session(db, session.id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert room.game_session.current_turn == 1
    assert room.game_session.drawer_user_id != drawer_id


def test_host_leave_migrates_during_game(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    change = leave_room(db, code=room.code, user_id=host.id)
    assert change.room is not None
    assert change.host_changed is True
    assert change.room.host_id in {guest.id, third.id}
    assert change.room.status == ROOM_STATUS_PLAYING
    assert change.room.game_session.phase != GAME_PHASE_LOBBY


def test_legacy_room_missing_settings_snapshot_and_backfill(db: Session) -> None:
    from app.services.room import ensure_room_game_defaults, get_user_active_room, sweep_stale_rooms

    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)

    # Simulate a pre-lifecycle room with no settings/session rows.
    if room.game_settings is not None:
        db.delete(room.game_settings)
    if room.game_session is not None:
        db.delete(room.game_session)
    db.commit()
    db.expire_all()

    room = db.get(type(room), room.id)
    assert room is not None
    room.game_settings = None
    room.game_session = None

    # Snapshot must not crash even before backfill.
    snapshot = RoomResponse.from_room(room)
    assert snapshot.settings.total_rounds == 3
    assert snapshot.game.phase == GAME_PHASE_LOBBY

    # Active-room path backfills defaults.
    active = get_user_active_room(db, host.id)
    assert active is not None
    assert active.game_settings is not None
    assert active.game_session is not None

    # Sweeper must tolerate joined collection loads (unique()).
    ensure_room_game_defaults(db, active, commit=True)
    changes = sweep_stale_rooms(db)
    assert isinstance(changes, list)
