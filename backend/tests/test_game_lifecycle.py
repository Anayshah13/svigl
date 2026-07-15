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


def test_midgame_join_waits_then_enters_next_round(db: Session) -> None:
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

    # Enter round 1 before the late player joins.
    _advance_to_round_active(db, room)

    change = join_room(db, code=room.code, user_id=late.id)
    assert change.joined_as_waiting is True
    db.refresh(room)
    assert late.id in RoomResponse.from_room(room).waiting_player_ids
    assert late.id not in {p.user_id for p in room.game_session.players}

    # Finish first drawer turn -> still mid round 1
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_ACTIVE
    db.refresh(room)
    assert late.id not in {p.user_id for p in room.game_session.players}

    # End second turn of round 1 -> admit late joiner for round 2
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert late.id in {p.user_id for p in room.game_session.players if p.is_active}
    assert late.id not in RoomResponse.from_room(room).waiting_player_ids


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
    from app.services.game import _player_for_turn, planned_turns

    host = _user(db, "Host")
    users = [host]
    room = create_room(db, host_id=host.id, max_players=8)
    for index in range(player_count - 1):
        guest = _user(db, f"Guest{index}")
        users.append(guest)
        join_room(db, code=room.code, user_id=guest.id)

    # Scribble.io: settings rounds = full rotations (each player draws once per round).
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
    assert planned_turns(session) == total_rounds * player_count

    frozen = [
        player.user_id
        for player in sorted(session.players, key=lambda item: item.rotation_index)
    ]
    drawers = []
    for turn in range(planned_turns(session)):
        result = _player_for_turn(session, turn)
        assert result is not None
        drawers.append(result[1].user_id)
    assert drawers == [
        frozen[index % player_count]
        for index in range(total_rounds * player_count)
    ]
    # Each player draws exactly `total_rounds` times.
    for player_id in frozen:
        assert drawers.count(player_id) == total_rounds
    assert session.drawer_user_id == frozen[0]
    assert RoomResponse.from_room(room).game.current_round == 1


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
