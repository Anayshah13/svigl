"""Tests for majority vote-kick thresholds and successful kick."""

from __future__ import annotations

import os
import uuid

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
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.room import GAME_PHASE_LOBBY, GAME_PHASE_ROUND_ACTIVE
from app.models.user import User
from app.services.room import create_room, join_room, leave_room
from app.services.vote_kick import (
    cast_vote_kick,
    clear_room_votes,
    get_tally,
    required_votes,
)


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
        clear_room_votes("ZZZZ")
        # Clear any leftover in-memory tallies from prior tests.
        from app.services import vote_kick as vk

        vk._votes.clear()


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


def _room_with_players(db: Session, count: int):
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    players = [host]
    for i in range(count - 1):
        guest = _user(db, f"Guest{i}")
        join_room(db, code=room.code, user_id=guest.id)
        players.append(guest)
    db.refresh(room)
    return room, players


def _begin_drawing(db: Session, room, drawer_id) -> None:
    """Put the room into ROUND_ACTIVE with ``drawer_id`` as the drawer."""
    session = room.game_session
    assert session is not None
    session.phase = GAME_PHASE_ROUND_ACTIVE
    session.drawer_user_id = drawer_id
    session.secret_word = "banana"
    db.flush()
    db.refresh(room)


def test_required_votes_thresholds() -> None:
    assert required_votes(3) == 2
    assert required_votes(4) == 3
    assert required_votes(5) == 3
    assert required_votes(2) == 2
    assert required_votes(6) == 4
    assert required_votes(7) == 4


def test_cannot_vote_kick_in_lobby(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    host, a, target = players
    assert room.game_session is not None
    assert room.game_session.phase == GAME_PHASE_LOBBY

    with pytest.raises(HTTPException) as exc:
        cast_vote_kick(db, room.code, host.id, target.id)
    assert exc.value.status_code == 409
    assert "drawing" in exc.value.detail.lower()


def test_cannot_vote_kick_non_drawer(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    host, a, drawer = players
    _begin_drawing(db, room, drawer.id)

    with pytest.raises(HTTPException) as exc:
        cast_vote_kick(db, room.code, host.id, a.id)
    assert exc.value.status_code == 409
    assert "drawing" in exc.value.detail.lower()


def test_cannot_vote_kick_self(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    drawer = players[0]
    _begin_drawing(db, room, drawer.id)
    with pytest.raises(HTTPException) as exc:
        cast_vote_kick(db, room.code, drawer.id, drawer.id)
    assert exc.value.status_code == 409


def test_vote_kick_threshold_three_players(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    host, a, drawer = players
    _begin_drawing(db, room, drawer.id)

    first = cast_vote_kick(db, room.code, host.id, drawer.id)
    assert not first.kicked
    assert first.tally.votes == 1
    assert first.tally.required == 2
    assert first.tally.player_count == 3

    second = cast_vote_kick(db, room.code, a.id, drawer.id)
    assert second.kicked
    assert second.tally.votes == 2
    assert second.tally.required == 2

    db.refresh(room)
    member_ids = {rp.user_id for rp in room.players}
    assert drawer.id not in member_ids
    assert len(room.players) == 2


def test_vote_kick_threshold_four_players(db: Session) -> None:
    room, players = _room_with_players(db, 4)
    host, a, b, drawer = players
    _begin_drawing(db, room, drawer.id)

    for voter in (host, a):
        result = cast_vote_kick(db, room.code, voter.id, drawer.id)
        assert not result.kicked
        assert result.tally.required == 3

    third = cast_vote_kick(db, room.code, b.id, drawer.id)
    assert third.kicked
    assert third.tally.required == 3

    db.refresh(room)
    assert drawer.id not in {rp.user_id for rp in room.players}
    assert len(room.players) == 3


def test_vote_kick_threshold_five_players(db: Session) -> None:
    room, players = _room_with_players(db, 5)
    drawer = players[-1]
    voters = players[:-1]
    _begin_drawing(db, room, drawer.id)

    for voter in voters[:2]:
        result = cast_vote_kick(db, room.code, voter.id, drawer.id)
        assert not result.kicked
        assert result.tally.required == 3

    third = cast_vote_kick(db, room.code, voters[2].id, drawer.id)
    assert third.kicked
    assert third.tally.required == 3

    db.refresh(room)
    assert drawer.id not in {rp.user_id for rp in room.players}
    assert len(room.players) == 4


def test_retract_vote(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    host, a, drawer = players
    _begin_drawing(db, room, drawer.id)

    cast_vote_kick(db, room.code, host.id, drawer.id)
    retracted = cast_vote_kick(db, room.code, host.id, drawer.id, retract=True)
    assert retracted.retracted
    assert retracted.tally.votes == 0
    assert not retracted.kicked

    # One vote again is not enough.
    again = cast_vote_kick(db, room.code, a.id, drawer.id)
    assert not again.kicked
    assert again.tally.votes == 1


def test_votes_clear_when_target_leaves(db: Session) -> None:
    room, players = _room_with_players(db, 4)
    host, a, b, drawer = players
    _begin_drawing(db, room, drawer.id)

    cast_vote_kick(db, room.code, host.id, drawer.id)
    cast_vote_kick(db, room.code, a.id, drawer.id)
    tally = get_tally(room.code, drawer.id, player_count=4)
    assert tally.votes == 2

    leave_room(db, room.code, drawer.id)
    tally_after = get_tally(room.code, drawer.id, player_count=3)
    assert tally_after.votes == 0


def test_idempotent_duplicate_vote(db: Session) -> None:
    room, players = _room_with_players(db, 3)
    host, _a, drawer = players
    _begin_drawing(db, room, drawer.id)

    first = cast_vote_kick(db, room.code, host.id, drawer.id)
    second = cast_vote_kick(db, room.code, host.id, drawer.id)
    assert first.tally.votes == 1
    assert second.tally.votes == 1
    assert not second.kicked
