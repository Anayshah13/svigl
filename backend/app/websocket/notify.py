"""
Bridge between REST mutations / sweeper / game runtime and WebSocket broadcasts.

After any room-mutating call (join, leave, kick, transfer-host, eviction),
push the update to connected clients via these helpers.

Sync FastAPI route handlers run in a thread pool (no running event loop).
Notifications must therefore:
1. Serialize the room snapshot while the DB session is still open.
2. Schedule the async broadcast onto the app's main event loop.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Coroutine
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.models.room import Room
from app.schemas.room import RoomResponse
from app.services.game import GameMutation
from app.websocket.connection_manager import connection_manager
from app.websocket.events import EventType, make_event
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)

# Set once during app lifespan so sync REST handlers can schedule WS work.
_main_loop: asyncio.AbstractEventLoop | None = None

_EVENT_MAP: dict[str, EventType] = {
    "GAME_STARTED": EventType.GAME_STARTED,
    "COUNTDOWN_STARTED": EventType.COUNTDOWN_STARTED,
    "WORD_CHOICES_OFFERED": EventType.WORD_CHOICES_OFFERED,
    "WORD_SELECTED": EventType.WORD_SELECTED,
    "ROUND_STARTED": EventType.ROUND_STARTED,
    "ROUND_ENDED": EventType.ROUND_ENDED,
    "GAME_FINISHED": EventType.GAME_FINISHED,
    "TIMER_UPDATED": EventType.TIMER_UPDATED,
    "PLAYER_WAITING": EventType.PLAYER_WAITING,
    "GAME_STATE_UPDATED": EventType.GAME_STATE_UPDATED,
    "HOST_CHANGED": EventType.HOST_CHANGED,
    "CHAT_MESSAGE": EventType.CHAT_MESSAGE,
    "PLAYER_GUESSED": EventType.PLAYER_GUESSED,
    "SCORES_UPDATED": EventType.SCORES_UPDATED,
    "HINT_UPDATED": EventType.HINT_UPDATED,
    "CANVAS_CLEAR": EventType.CANVAS_CLEAR,
    "CANVAS_CLEARED": EventType.CANVAS_CLEARED,
    "SHAPE_CREATED": EventType.SHAPE_CREATED,
    "SHAPE_UPDATED": EventType.SHAPE_UPDATED,
    "SHAPE_DELETED": EventType.SHAPE_DELETED,
    "UNDO": EventType.UNDO,
    "REDO": EventType.REDO,
    "CANVAS_SNAPSHOT": EventType.CANVAS_SNAPSHOT,
}


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop
    logger.info("websocket notify main_loop registered")


def _snapshot(room: Room, *, viewer_id: UUID | None = None) -> dict[str, Any]:
    """Eager JSON snapshot — safe to use after the request DB session closes."""
    return RoomResponse.from_room(room, viewer_id=viewer_id).model_dump(mode="json")


def _snapshot_for_viewer(room_code: str, viewer_id: UUID) -> dict[str, Any] | None:
    """Load a fresh viewer-scoped snapshot (used after the request DB session closes)."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        room = db.query(Room).filter(Room.code == room_code.upper()).first()
        if room is None:
            return None
        return _snapshot(room, viewer_id=viewer_id)
    finally:
        db.close()


async def _broadcast_personalized(
    room_code: str,
    event_type: EventType,
    *,
    public_snapshot: dict[str, Any],
    revision: int,
    phase: str,
    extras: dict[str, Any],
) -> None:
    """Send per-viewer room snapshots so correct guessers / drawer see private fields."""
    room_state = room_manager.get_room(room_code)
    if room_state is None or not room_state.clients:
        await _broadcast(
            room_code,
            event_type,
            room=public_snapshot,
            revision=revision,
            phase=phase,
            **extras,
        )
        return

    for user_id in list(room_state.clients.keys()):
        viewer_snap = await asyncio.to_thread(_snapshot_for_viewer, room_code, user_id)
        await room_manager.send_to_user(
            room_code,
            user_id,
            event_type,
            room=viewer_snap or public_snapshot,
            revision=revision,
            phase=phase,
            **extras,
        )


def fire_and_forget(coro: Coroutine[Any, Any, Any]) -> None:
    """
    Schedule an async notification from either an async context or a sync
    thread-pool REST handler.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None and loop.is_running():
        loop.create_task(coro)
        return

    if _main_loop is not None and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, _main_loop)
        return

    logger.warning(
        "WS notification dropped — no event loop available (sync handler without main_loop?)"
    )
    coro.close()


async def _broadcast(
    room_code: str, event_type: EventType, **payload: object
) -> None:
    room_state = room_manager.get_room(room_code)
    recipients = len(room_state.clients) if room_state is not None else 0
    # TIMER_UPDATED fires every second — keep it off the hot INFO path.
    log = logger.debug if event_type == EventType.TIMER_UPDATED else logger.info
    log(
        "WS broadcast type=%s room=%s recipients=%s",
        event_type,
        room_code,
        recipients,
    )
    if recipients == 0 and event_type != EventType.TIMER_UPDATED:
        logger.warning(
            "WS broadcast has no recipients room=%s type=%s "
            "(clients may not have sent JOIN_ROOM yet)",
            room_code,
            event_type,
        )
    await room_manager.broadcast(room_code, event_type, **payload)


def notify_room_updated(room: Room) -> None:
    """Broadcast the full room state to all connected clients in that room."""
    code = room.code
    snapshot = _snapshot(room)
    fire_and_forget(_broadcast(code, EventType.ROOM_UPDATED, room=snapshot))


def notify_player_joined(room: Room, player_id: UUID, player_name: str) -> None:
    code = room.code
    snapshot = _snapshot(room)
    fire_and_forget(
        _broadcast(
            code,
            EventType.PLAYER_JOINED,
            player_id=str(player_id),
            player_name=player_name,
            room=snapshot,
        )
    )


def notify_player_waiting(room: Room, player_id: UUID, player_name: str) -> None:
    code = room.code
    snapshot = _snapshot(room)
    fire_and_forget(
        _broadcast(
            code,
            EventType.PLAYER_WAITING,
            player_id=str(player_id),
            player_name=player_name,
            room=snapshot,
            revision=snapshot.get("revision"),
        )
    )


def notify_host_changed(room: Room, previous_host_id: UUID) -> None:
    code = room.code
    snapshot = _snapshot(room)
    fire_and_forget(
        _broadcast(
            code,
            EventType.HOST_CHANGED,
            host_id=str(room.host_id),
            previous_host_id=str(previous_host_id),
            room=snapshot,
            revision=snapshot.get("revision"),
        )
    )


def notify_player_left(
    room_code: str, player_id: UUID, player_name: str, room: Room | None = None
) -> None:
    if room is not None:
        snapshot = _snapshot(room)
        fire_and_forget(
            _broadcast(
                room_code,
                EventType.PLAYER_LEFT,
                player_id=str(player_id),
                player_name=player_name,
                room=snapshot,
                room_deleted=False,
            )
        )
        return

    fire_and_forget(
        _broadcast(
            room_code,
            EventType.PLAYER_LEFT,
            player_id=str(player_id),
            player_name=player_name,
            room_deleted=True,
        )
    )


def notify_game_mutation(mutation: GameMutation | None, room: Room | None) -> None:
    if mutation is None or room is None:
        return
    snapshot = _snapshot(room)
    fire_and_forget(broadcast_game_events_async(mutation, snapshot))


async def broadcast_game_events_async(
    mutation: GameMutation, snapshot: dict[str, Any]
) -> None:
    for event_name in mutation.events:
        event_type = _EVENT_MAP.get(event_name)
        if event_type is None:
            logger.warning("Unknown game event %s", event_name)
            continue

        extras = dict(mutation.event_extras.get(event_name, {}))

        if event_type == EventType.CHAT_MESSAGE:
            for chat in mutation.chat_events:
                payload = {
                    "kind": chat.kind,
                    "message": chat.message,
                    "player_id": chat.player_id,
                    "player_name": chat.player_name,
                    "revision": mutation.revision,
                    "phase": mutation.phase,
                }
                if chat.recipient_ids is not None:
                    for recipient_id in chat.recipient_ids:
                        await room_manager.send_to_user(
                            mutation.room_code,
                            recipient_id,
                            event_type,
                            room=snapshot,
                            **payload,
                        )
                else:
                    await _broadcast(
                        mutation.room_code,
                        event_type,
                        room=snapshot,
                        **payload,
                    )
            continue

        if event_type == EventType.WORD_CHOICES_OFFERED:
            # Private to drawer — never broadcast choices room-wide.
            private = mutation.private_drawer
            if private is not None and private.word_choices:
                drawer_snap = await asyncio.to_thread(
                    _snapshot_for_viewer, mutation.room_code, private.user_id
                )
                await room_manager.send_to_user(
                    mutation.room_code,
                    private.user_id,
                    event_type,
                    word_choices=list(private.word_choices),
                    revision=mutation.revision,
                    phase=mutation.phase,
                    room=drawer_snap or snapshot,
                )
            continue

        if event_type in (EventType.ROUND_STARTED, EventType.WORD_SELECTED):
            private = mutation.private_drawer
            if private is not None and private.secret_word:
                drawer_snap = await asyncio.to_thread(
                    _snapshot_for_viewer, mutation.room_code, private.user_id
                )
                await room_manager.send_to_user(
                    mutation.room_code,
                    private.user_id,
                    EventType.WORD_SELECTED
                    if event_type == EventType.WORD_SELECTED
                    else EventType.ROUND_STARTED,
                    secret_word=private.secret_word,
                    word_hint=extras.get("word_hint"),
                    word_length=extras.get("word_length")
                    or len(private.secret_word.replace(" ", "")),
                    revision=mutation.revision,
                    phase=mutation.phase,
                    room=drawer_snap or snapshot,
                    **{
                        k: v
                        for k, v in extras.items()
                        if k not in ("word_hint", "word_length")
                    },
                )
            # Still broadcast public ROUND_STARTED / WORD_SELECTED without secret.
            public_extras = {
                k: v for k, v in extras.items() if k != "secret_word"
            }
            await _broadcast(
                mutation.room_code,
                event_type,
                room=snapshot,
                revision=mutation.revision,
                phase=mutation.phase,
                **public_extras,
            )
            continue

        if event_type == EventType.CANVAS_CLEAR:
            # Persist wipe + broadcast CANVAS_CLEARED (ops protocol event).
            await _clear_and_broadcast_canvas(mutation.room_code)
            continue

        if event_type == EventType.ROUND_ENDED and mutation.round_summary:
            extras = {**mutation.round_summary, **extras}

        if event_type == EventType.SCORES_UPDATED and mutation.scores:
            extras.setdefault("scores", list(mutation.scores))

        if event_type == EventType.GAME_FINISHED and mutation.winner_user_id:
            extras.setdefault("winner_user_id", str(mutation.winner_user_id))

        if event_type == EventType.PLAYER_GUESSED and mutation.private_to_user_id:
            guesser_snap = await asyncio.to_thread(
                _snapshot_for_viewer,
                mutation.room_code,
                mutation.private_to_user_id,
            )
            await room_manager.send_to_user(
                mutation.room_code,
                mutation.private_to_user_id,
                event_type,
                room=guesser_snap or snapshot,
                revision=mutation.revision,
                phase=mutation.phase,
                secret_word=mutation.private_secret_word,
                **extras,
            )
            # Public PLAYER_GUESSED without the secret.
            await _broadcast(
                mutation.room_code,
                event_type,
                room=snapshot,
                revision=mutation.revision,
                phase=mutation.phase,
                **extras,
            )
            continue

        if event_type in (
            EventType.HINT_UPDATED,
            EventType.GAME_STATE_UPDATED,
            EventType.SCORES_UPDATED,
        ):
            await _broadcast_personalized(
                mutation.room_code,
                event_type,
                public_snapshot=snapshot,
                revision=mutation.revision,
                phase=mutation.phase,
                extras=extras,
            )
            continue

        await _broadcast(
            mutation.room_code,
            event_type,
            room=snapshot,
            revision=mutation.revision,
            phase=mutation.phase,
            **extras,
        )


async def _clear_and_broadcast_canvas(room_code: str) -> None:
    from app.db.session import SessionLocal
    from app.services.canvas import clear_canvas_for_room_code

    def _clear() -> dict[str, Any] | None:
        db = SessionLocal()
        try:
            return clear_canvas_for_room_code(db, room_code)
        finally:
            db.close()

    try:
        payload = await asyncio.to_thread(_clear)
    except Exception:
        logger.exception("Failed to clear canvas room=%s", room_code)
        return

    if payload is None:
        await _broadcast(
            room_code,
            EventType.CANVAS_CLEARED,
            shapes=[],
            op_seq=0,
            reason="round_started",
        )
        return
    await _broadcast(room_code, EventType.CANVAS_CLEARED, **payload)


async def broadcast_timer_async(
    room_code: str,
    *,
    remaining_seconds: int,
    phase: str,
    revision: int,
    deadline_at: str | None = None,
) -> None:
    """Lightweight tick — timer fields only (not a full room dump)."""
    now = datetime.now(timezone.utc).isoformat()
    await _broadcast(
        room_code,
        EventType.TIMER_UPDATED,
        room_code=room_code,
        remaining_seconds=remaining_seconds,
        phase=phase,
        revision=revision,
        server_time=now,
        deadline_at=deadline_at,
    )


async def _notify_player_kicked_async(
    room_code: str,
    snapshot: dict[str, Any],
    kicked_id: UUID,
    kicked_name: str,
) -> None:
    await _broadcast(
        room_code,
        EventType.PLAYER_KICKED,
        player_id=str(kicked_id),
        player_name=kicked_name,
        room=snapshot,
    )

    kicked_client = connection_manager.get(kicked_id)
    if kicked_client is not None:
        try:
            await kicked_client.websocket.send_text(
                make_event(
                    EventType.PLAYER_KICKED,
                    player_id=str(kicked_id),
                    player_name=kicked_name,
                    room=snapshot,
                    kicked=True,
                    reason="You were kicked from the room.",
                )
            )
        except Exception:
            logger.debug("Failed to send kick notice to user=%s", kicked_id)

    await room_manager.disconnect_user(room_code, kicked_id)


def notify_player_kicked(room: Room, kicked_id: UUID, kicked_name: str) -> None:
    """
    Notify the room about a kick, deliver a direct message (with room snapshot)
    to the kicked user, then remove them from the in-memory room channel.
    """
    code = room.code
    snapshot = _snapshot(room)
    fire_and_forget(
        _notify_player_kicked_async(code, snapshot, kicked_id, kicked_name)
    )


def notify_vote_kick_update(
    room_code: str,
    *,
    target_id: UUID,
    votes: int,
    required: int,
    player_count: int,
    voter_ids: list[str],
    kicked: bool = False,
    retracted: bool = False,
    cleared: bool = False,
) -> None:
    """Broadcast vote-kick tally (or a clear) to everyone in the room channel."""
    fire_and_forget(
        _broadcast(
            room_code,
            EventType.VOTE_KICK_UPDATE,
            target_id=str(target_id),
            votes=votes,
            required=required,
            player_count=player_count,
            voter_ids=voter_ids,
            kicked=kicked,
            retracted=retracted,
            cleared=cleared,
        )
    )


def notify_vote_kick_room_cleared(room_code: str) -> None:
    """Tell clients to wipe all in-progress vote-kick tallies for the room."""
    fire_and_forget(
        _broadcast(
            room_code,
            EventType.VOTE_KICK_UPDATE,
            cleared=True,
            votes=0,
            required=0,
            player_count=0,
            voter_ids=[],
        )
    )


async def broadcast_host_changed_async(
    room_code: str,
    *,
    host_id: str,
    previous_host_id: str,
    snapshot: dict[str, Any],
) -> None:
    await _broadcast(
        room_code,
        EventType.HOST_CHANGED,
        host_id=host_id,
        previous_host_id=previous_host_id,
        room=snapshot,
        revision=snapshot.get("revision"),
    )


async def broadcast_room_change_async(
    room_code: str,
    snapshot: dict[str, Any] | None,
    *,
    player_id: UUID | None = None,
    player_name: str | None = None,
) -> None:
    """Async-safe broadcast used by the sweeper (already on the event loop)."""
    if snapshot is not None:
        await _broadcast(room_code, EventType.ROOM_UPDATED, room=snapshot)
        return

    payload: dict[str, object] = {"room_deleted": True}
    if player_id is not None:
        payload["player_id"] = str(player_id)
    if player_name is not None:
        payload["player_name"] = player_name
    await _broadcast(room_code, EventType.PLAYER_LEFT, **payload)
