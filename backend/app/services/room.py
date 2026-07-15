import random
import string
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.room import (
    GAME_PHASE_LOBBY,
    ROOM_STATUS_FINISHED,
    ROOM_STATUS_PLAYING,
    ROOM_STATUS_WAITING,
    GameSession,
    GameSettings,
    Room,
    RoomPlayer,
)
from app.services.game import GameMutation, handle_player_departure


_CODE_CHARS = string.ascii_uppercase
_MAX_CODE_ATTEMPTS = 20
# Grace window for refresh / brief network loss before membership eviction.
PRESENCE_TTL_SECONDS = 45


@dataclass
class MembershipChange:
    room: Room | None
    game_mutation: GameMutation | None = None
    host_changed: bool = False
    previous_host_id: UUID | None = None
    joined_as_waiting: bool = False


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


def _load_room(
    db: Session,
    *,
    code: str | None = None,
    room_id: UUID | None = None,
    for_update: bool = False,
) -> Room | None:
    """
    Load a Room (collections use selectin, so no unique()/outer-join lock issues).

    When ``for_update`` is set, lock only the ``rooms`` row first. Postgres rejects
    ``FOR UPDATE`` on queries that LEFT OUTER JOIN nullable sides.
    """
    if for_update:
        lock_stmt = select(Room.id)
        if code is not None:
            lock_stmt = lock_stmt.where(Room.code == code.upper())
        elif room_id is not None:
            lock_stmt = lock_stmt.where(Room.id == room_id)
        else:
            raise ValueError("code or room_id is required")
        locked_id = db.execute(lock_stmt.with_for_update()).scalar_one_or_none()
        if locked_id is None:
            return None
        return db.execute(select(Room).where(Room.id == locked_id)).scalar_one_or_none()

    stmt = select(Room)
    if code is not None:
        stmt = stmt.where(Room.code == code.upper())
    elif room_id is not None:
        stmt = stmt.where(Room.id == room_id)
    else:
        raise ValueError("code or room_id is required")
    return db.execute(stmt).scalar_one_or_none()


def ensure_room_game_defaults(
    db: Session, room: Room, *, commit: bool = True
) -> Room:
    """Backfill GameSettings / lobby GameSession for pre-lifecycle rooms."""
    changed = False
    if room.game_settings is None:
        settings = GameSettings(room_id=room.id)
        db.add(settings)
        room.game_settings = settings
        changed = True
    if room.game_session is None:
        session = GameSession(room_id=room.id, phase=GAME_PHASE_LOBBY)
        db.add(session)
        room.game_session = session
        changed = True
    if changed:
        db.flush()
        if commit:
            db.commit()
            db.refresh(room)
    return room


def _get_room_or_404(db: Session, code: str) -> Room:
    room = _load_room(db, code=code)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    return ensure_room_game_defaults(db, room, commit=True)


def _remove_player(db: Session, room: Room, user_id: UUID) -> MembershipChange:
    """Remove a player from a room and apply game-departure side effects."""
    from app.services.vote_kick import clear_room_votes, clear_votes_involving_player

    target = next((rp for rp in list(room.players) if rp.user_id == user_id), None)
    if target is None:
        return MembershipChange(room=room)

    room_code = room.code
    previous_host_id = room.host_id
    was_host = room.host_id == user_id
    game_mutation = handle_player_departure(db, room, user_id)

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
        clear_room_votes(room_code)
        return MembershipChange(
            room=None,
            game_mutation=game_mutation,
            host_changed=False,
            previous_host_id=previous_host_id,
        )

    host_changed = False
    if was_host:
        room.host_id = remaining[0].user_id
        host_changed = True

    db.commit()
    db.refresh(room)
    clear_votes_involving_player(room_code, user_id)
    return MembershipChange(
        room=room,
        game_mutation=game_mutation,
        host_changed=host_changed,
        previous_host_id=previous_host_id if host_changed else None,
    )


def touch_membership_presence(db: Session, user_id: UUID, room_code: str) -> bool:
    """
    Bump last_seen_at for a member without running eviction.
    Returns True if the user is a member of the room.
    """
    membership = _get_membership(db, user_id, room_code)
    if membership is None:
        return False
    membership.last_seen_at = _utcnow()
    db.commit()
    return True


def _get_membership(db: Session, user_id: UUID, room_code: str) -> RoomPlayer | None:
    return db.scalar(
        select(RoomPlayer)
        .join(Room)
        .where(
            RoomPlayer.user_id == user_id,
            Room.code == room_code.upper(),
            Room.status != ROOM_STATUS_FINISHED,
        )
    )


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def evict_stale_players(db: Session, room: Room) -> tuple[MembershipChange, list[UUID]]:
    """Drop players whose client has not sent a presence signal recently."""
    db.refresh(room)
    cutoff = _utcnow() - timedelta(seconds=PRESENCE_TTL_SECONDS)
    stale_user_ids = [
        rp.user_id
        for rp in list(room.players)
        if _aware(rp.last_seen_at) < cutoff
    ]

    current = MembershipChange(room=room)
    evicted: list[UUID] = []
    for user_id in stale_user_ids:
        if current.room is None:
            break
        db.refresh(current.room)
        change = _remove_player(db, current.room, user_id)
        # Prefer the latest game mutation / host-change flags across the batch.
        current = MembershipChange(
            room=change.room,
            game_mutation=change.game_mutation or current.game_mutation,
            host_changed=change.host_changed or current.host_changed,
            previous_host_id=change.previous_host_id or current.previous_host_id,
        )
        evicted.append(user_id)

    return current, evicted


def sweep_stale_rooms(db: Session) -> list[tuple[str, MembershipChange, list[UUID]]]:
    """
    Evict stale memberships across all active rooms.
    Returns (room_code, membership_change, evicted_user_ids) for rooms that changed.
    """
    rooms = db.scalars(
        select(Room).where(
            Room.status.in_([ROOM_STATUS_WAITING, ROOM_STATUS_PLAYING]),
        )
    ).all()

    changes: list[tuple[str, MembershipChange, list[UUID]]] = []
    for room in rooms:
        ensure_room_game_defaults(db, room, commit=True)
        code = room.code
        updated, evicted = evict_stale_players(db, room)
        if evicted:
            changes.append((code, updated, evicted))
    return changes


def touch_room_presence(
    db: Session, code: str, user_id: UUID
) -> tuple[MembershipChange, list[UUID]]:
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

    change, evicted = evict_stale_players(db, room)
    if change.room is None:
        return change, evicted

    # Presence touch already flushed; ensure commit if no eviction ran.
    if not evicted:
        db.commit()
        db.refresh(change.room)
    return change, evicted


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

    db.add(GameSettings(room_id=room.id))
    db.add(GameSession(room_id=room.id, phase=GAME_PHASE_LOBBY))
    db.add(RoomPlayer(room_id=room.id, user_id=host_id, last_seen_at=now))
    db.commit()
    db.refresh(room)
    return room


def join_room(db: Session, code: str, user_id: UUID) -> MembershipChange:
    room = _get_room_or_404(db, code)

    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )

    already_in = next((rp for rp in room.players if rp.user_id == user_id), None)
    if already_in:
        already_in.last_seen_at = _utcnow()
        db.commit()
        db.refresh(room)
        waiting = (
            room.game_session is not None
            and room.game_session.phase != GAME_PHASE_LOBBY
            and user_id
            not in {
                p.user_id for p in room.game_session.players if p.is_active
            }
        )
        return MembershipChange(room=room, joined_as_waiting=waiting)

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

    # Midgame join: allowed while PLAYING; player is waiting and excluded from rotation.
    joined_as_waiting = (
        room.status == ROOM_STATUS_PLAYING
        and room.game_session is not None
        and room.game_session.phase != GAME_PHASE_LOBBY
    )

    player = RoomPlayer(
        room_id=room.id,
        user_id=user_id,
        last_seen_at=_utcnow(),
        is_ready=False,
    )
    db.add(player)
    if room.game_session is not None and joined_as_waiting:
        room.game_session.revision += 1
    db.commit()
    db.refresh(room)
    return MembershipChange(room=room, joined_as_waiting=joined_as_waiting)


def leave_room(db: Session, code: str, user_id: UUID) -> MembershipChange:
    """Remove a player from a room. Returns membership change details."""
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
) -> MembershipChange:
    """
    Host removes another player from the room.

    Edge cases handled:
    - Non-host caller → 403
    - Host trying to kick themselves → 409 (use leave instead)
    - Target not in room → 409
    - Room is FINISHED → 410
    - Room deleted after kick (shouldn't happen since host stays) → room=None
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
) -> MembershipChange:
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

    previous_host_id = room.host_id
    room.host_id = new_host_id
    if room.game_session is not None:
        room.game_session.revision += 1
    db.commit()
    db.refresh(room)
    return MembershipChange(
        room=room,
        host_changed=True,
        previous_host_id=previous_host_id,
    )


def get_user_active_room(db: Session, user_id: UUID) -> Room | None:
    """Return the user's active room, ensuring game defaults exist."""
    membership = _get_active_room_for_user(db, user_id)
    if membership is None:
        return None

    room = _load_room(db, room_id=membership.room_id)
    if room is None:
        return None
    return ensure_room_game_defaults(db, room)


def get_room(db: Session, code: str) -> Room:
    """Return the room, ensuring game defaults exist."""
    return _get_room_or_404(db, code)
