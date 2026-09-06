"""System robot membership for regular multiplayer rooms."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.room import GAME_PHASE_LOBBY, ROOM_STATUS_FINISHED, Room, RoomPlayer
from app.models.user import User
from app.services.game import _ensure_lobby_session
from app.services.room import (
    MembershipChange,
    _assert_host,
    _get_room_or_404,
    _remove_player,
    _utcnow,
)

BOT_PROVIDER = "system"
BOT_PROVIDER_ID = "robo"
BOT_DISPLAY_NAME = "AnAI 1.3 Pro"


def is_bot_user(user: User | None) -> bool:
    return bool(user is not None and getattr(user, "is_bot", False))


def is_bot_membership(membership: RoomPlayer | None) -> bool:
    return membership is not None and is_bot_user(getattr(membership, "user", None))


def room_bot_membership(room: Room) -> RoomPlayer | None:
    return next((rp for rp in room.players if is_bot_membership(rp)), None)


def room_has_bot(room: Room) -> bool:
    return room_bot_membership(room) is not None


def _unique_bot_name(db: Session, *, exclude_user_id: UUID | None = None) -> str:
    from app.auth.repository import is_name_taken

    if not is_name_taken(db, BOT_DISPLAY_NAME, exclude_user_id=exclude_user_id):
        return BOT_DISPLAY_NAME
    for suffix in range(2, 10_000):
        candidate = f"{BOT_DISPLAY_NAME} {suffix}"
        if not is_name_taken(db, candidate, exclude_user_id=exclude_user_id):
            return candidate
    return BOT_DISPLAY_NAME


def get_or_create_robo_user(db: Session) -> User:
    """Stable shared identity used in every room that has a robot."""
    existing = db.scalar(
        select(User).where(
            User.provider == BOT_PROVIDER,
            User.provider_id == BOT_PROVIDER_ID,
        )
    )
    if existing is not None:
        changed = False
        if not existing.is_bot:
            existing.is_bot = True
            changed = True
        next_name = _unique_bot_name(db, exclude_user_id=existing.id)
        if existing.name != next_name:
            existing.name = next_name
            changed = True
        if changed:
            db.flush()
        return existing

    user = User(
        provider=BOT_PROVIDER,
        provider_id=BOT_PROVIDER_ID,
        email=None,
        name=_unique_bot_name(db),
        avatar_url=None,
        is_bot=True,
    )
    db.add(user)
    db.flush()
    return user


def _assert_lobby(room: Room) -> None:
    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )
    session = room.game_session
    if session is not None and session.phase != GAME_PHASE_LOBBY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Robot players can only be added or removed in the lobby.",
        )


def add_room_bot(db: Session, code: str, host_id: UUID) -> MembershipChange:
    room = _get_room_or_404(db, code)
    _assert_host(room, host_id)
    _assert_lobby(room)

    if room_has_bot(room):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This room already has a robot player.",
        )
    if len(room.players) >= room.max_players:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is full.",
        )

    bot = get_or_create_robo_user(db)
    already = next((rp for rp in room.players if rp.user_id == bot.id), None)
    if already is not None:
        already.is_ready = True
        already.last_seen_at = _utcnow()
    else:
        room.players.append(
            RoomPlayer(
                room_id=room.id,
                user_id=bot.id,
                last_seen_at=_utcnow(),
                is_ready=True,
            )
        )

    session = _ensure_lobby_session(db, room)
    session.revision += 1
    db.commit()
    db.refresh(room)
    return MembershipChange(room=room)


def remove_room_bot(db: Session, code: str, host_id: UUID) -> MembershipChange:
    room = _get_room_or_404(db, code)
    _assert_host(room, host_id)
    _assert_lobby(room)

    membership = room_bot_membership(room)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This room does not have a robot player.",
        )
    return _remove_player(db, room, membership.user_id)

