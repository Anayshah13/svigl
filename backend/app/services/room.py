import random
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.room import (
    ROOM_STATUS_FINISHED,
    ROOM_STATUS_PLAYING,
    ROOM_STATUS_WAITING,
    Room,
    RoomPlayer,
)

_CODE_CHARS = string.ascii_uppercase
_MAX_CODE_ATTEMPTS = 20
PRESENCE_TTL_SECONDS = 15


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_unique_code(db: Session) -> str:
    for _ in range(_MAX_CODE_ATTEMPTS):
        code = "".join(random.choices(_CODE_CHARS, k=4))
        exists = db.scalar(
            select(Room.id).where(
                Room.code == code,
                Room.status != ROOM_STATUS_FINISHED,
            )
        )
        if not exists:
            return code
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not generate a room code. Please try again.",
    )


def _get_active_room_for_user(db: Session, user_id: UUID) -> RoomPlayer | None:
    return db.scalar(
        select(RoomPlayer)
        .join(Room)
        .where(
            RoomPlayer.user_id == user_id,
            Room.status.in_([ROOM_STATUS_WAITING, ROOM_STATUS_PLAYING]),
        )
    )


def _get_room_or_404(db: Session, code: str) -> Room:
    room = db.scalar(select(Room).where(Room.code == code.upper()))
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    return room


def _remove_player(db: Session, room: Room, user_id: UUID) -> Room | None:
    """Remove a player from a room. Returns the room if it still exists, else None."""
    target = next((rp for rp in list(room.players) if rp.user_id == user_id), None)
    if target is None:
        return room

    was_host = room.host_id == user_id
    db.delete(target)
    db.flush()

    # Re-query after delete — room.players can be stale here and falsely appear empty.
    remaining = db.scalars(
        select(RoomPlayer)
        .where(RoomPlayer.room_id == room.id)
        .order_by(RoomPlayer.joined_at)
    ).all()

    if not remaining:
        db.delete(room)
        db.commit()
        return None

    if was_host:
        room.host_id = remaining[0].user_id

    db.commit()
    db.refresh(room)
    return room


def evict_stale_players(db: Session, room: Room) -> tuple[Room | None, list[UUID]]:
    """Drop players whose client has not sent a presence ping recently."""
    db.refresh(room)
    cutoff = _utcnow() - timedelta(seconds=PRESENCE_TTL_SECONDS)
    stale_user_ids = [
        rp.user_id for rp in list(room.players) if rp.last_seen_at < cutoff
    ]

    current: Room | None = room
    evicted: list[UUID] = []
    for user_id in stale_user_ids:
        if current is None:
            break
        db.refresh(current)
        current = _remove_player(db, current, user_id)
        evicted.append(user_id)

    return current, evicted


def touch_room_presence(db: Session, code: str, user_id: UUID) -> tuple[Room | None, list[UUID]]:
    """Record that a player is still connected and evict anyone who is not."""
    room = _get_room_or_404(db, code)

    target = next((rp for rp in room.players if rp.user_id == user_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are not in this room.",
        )

    target.last_seen_at = _utcnow()
    db.flush()

    room, evicted = evict_stale_players(db, room)
    if room is None:
        db.commit()
        return None, evicted

    db.commit()
    db.refresh(room)
    return room, evicted


def create_room(db: Session, host_id: UUID, max_players: int) -> Room:
    existing = _get_active_room_for_user(db, host_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already in an active room.",
        )

    code = _generate_unique_code(db)
    now = _utcnow()
    room = Room(code=code, host_id=host_id, max_players=max_players)
    db.add(room)
    db.flush()

    player = RoomPlayer(room_id=room.id, user_id=host_id, last_seen_at=now)
    db.add(player)
    db.commit()
    db.refresh(room)
    return room


def join_room(db: Session, code: str, user_id: UUID) -> Room:
    room = _get_room_or_404(db, code)

    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )
    if room.status == ROOM_STATUS_PLAYING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Game is already in progress.",
        )

    already_in = next((rp for rp in room.players if rp.user_id == user_id), None)
    if already_in:
        already_in.last_seen_at = _utcnow()
        db.commit()
        db.refresh(room)
        return room

    existing = _get_active_room_for_user(db, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already in another active room.",
        )

    if len(room.players) >= room.max_players:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is full.",
        )

    player = RoomPlayer(room_id=room.id, user_id=user_id, last_seen_at=_utcnow())
    db.add(player)
    db.commit()
    db.refresh(room)
    return room


def leave_room(db: Session, code: str, user_id: UUID) -> Room | None:
    """Remove a player from a room. Returns the room if it still exists, else None."""
    room = _get_room_or_404(db, code)
    return _remove_player(db, room, user_id)


def _assert_host(room: Room, user_id: UUID) -> None:
    if room.host_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the host can perform this action.",
        )


def _get_member_or_409(room: Room, target_id: UUID) -> RoomPlayer:
    target = next((rp for rp in room.players if rp.user_id == target_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That player is not in this room.",
        )
    return target


def kick_player(
    db: Session, code: str, host_id: UUID, target_id: UUID
) -> Room | None:
    """
    Host removes another player from the room.

    Edge cases handled:
    - Non-host caller → 403
    - Host trying to kick themselves → 409 (use leave instead)
    - Target not in room → 409
    - Room is FINISHED → 410
    - Room deleted after kick (shouldn't happen since host stays) → None
    """
    room = _get_room_or_404(db, code)

    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )

    _assert_host(room, host_id)

    if target_id == host_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can't kick yourself. Use leave instead.",
        )

    _get_member_or_409(room, target_id)

    return _remove_player(db, room, target_id)


def transfer_host(
    db: Session, code: str, host_id: UUID, new_host_id: UUID
) -> Room:
    """
    Transfer host role to another player in the room.

    Edge cases handled:
    - Non-host caller → 403
    - Transferring to yourself → 409
    - New host not in room → 409
    - Room is FINISHED → 410
    """
    room = _get_room_or_404(db, code)

    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )

    _assert_host(room, host_id)

    if new_host_id == host_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already the host.",
        )

    _get_member_or_409(room, new_host_id)

    room.host_id = new_host_id
    db.commit()
    db.refresh(room)
    return room


def get_user_active_room(db: Session, user_id: UUID) -> Room | None:
    membership = _get_active_room_for_user(db, user_id)
    if membership is None:
        return None

    room = db.get(Room, membership.room_id)
    if room is None:
        return None

    room, _ = evict_stale_players(db, room)
    if room is None:
        return None

    if not any(rp.user_id == user_id for rp in room.players):
        return None

    return room


def get_room(db: Session, code: str) -> Room:
    room = _get_room_or_404(db, code)
    room, _ = evict_stale_players(db, room)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    return room
