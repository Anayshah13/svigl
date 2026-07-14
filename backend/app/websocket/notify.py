"""
Bridge between REST mutations / sweeper and WebSocket broadcasts.

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
from typing import Any
from uuid import UUID

from app.models.room import Room
from app.schemas.room import RoomResponse
from app.websocket.connection_manager import connection_manager
from app.websocket.events import EventType, make_event
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)

# Set once during app lifespan so sync REST handlers can schedule WS work.
_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop
    logger.info("websocket notify main_loop registered")


def _snapshot(room: Room) -> dict[str, Any]:
    """Eager JSON snapshot — safe to use after the request DB session closes."""
    return RoomResponse.from_room(room).model_dump(mode="json")


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
    logger.info(
        "WS broadcast type=%s room=%s recipients=%s",
        event_type,
        room_code,
        recipients,
    )
    if recipients == 0:
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
