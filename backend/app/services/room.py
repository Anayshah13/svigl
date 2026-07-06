import random
import string
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


def create_room(db: Session, host_id: UUID, max_players: int) -> Room:
    existing = _get_active_room_for_user(db, host_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already in an active room.",
        )

    code = _generate_unique_code(db)
    room = Room(code=code, host_id=host_id, max_players=max_players)
    db.add(room)
    db.flush()

    player = RoomPlayer(room_id=room.id, user_id=host_id)
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

    already_in = any(rp.user_id == user_id for rp in room.players)
    if already_in:
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

    player = RoomPlayer(room_id=room.id, user_id=user_id)
    db.add(player)
    db.commit()
    db.refresh(room)
    return room


def leave_room(db: Session, code: str, user_id: UUID) -> Room | None:
    """Remove a player from a room. Returns the room if it still exists, else None."""
    room = _get_room_or_404(db, code)

    target = next((rp for rp in room.players if rp.user_id == user_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are not in this room.",
        )

    db.delete(target)
    db.flush()

    remaining = [rp for rp in room.players if rp.user_id != user_id]

    if not remaining:
        db.delete(room)
        db.commit()
        return None

    if room.host_id == user_id:
        room.host_id = remaining[0].user_id

    db.commit()
    db.refresh(room)
    return room


def get_user_active_room(db: Session, user_id: UUID) -> Room | None:
    membership = _get_active_room_for_user(db, user_id)
    if membership is None:
        return None
    return db.get(Room, membership.room_id)


def get_room(db: Session, code: str) -> Room:
    return _get_room_or_404(db, code)
