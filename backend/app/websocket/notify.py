"""
Bridge between REST mutations and WebSocket broadcasts.

After any room-mutating REST call (join, leave, kick, transfer-host),
call the appropriate notify function to push the update to connected clients.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.models.room import Room
from app.schemas.room import RoomResponse
from app.websocket.events import EventType
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)


def _get_loop() -> asyncio.AbstractEventLoop | None:
    try:
        return asyncio.get_running_loop()
    except RuntimeError:
        return None


async def notify_room_updated(room: Room) -> None:
    """Broadcast the full room state to all connected clients in that room."""
    snapshot = RoomResponse.from_room(room).model_dump(mode="json")
    await room_manager.broadcast(room.code, EventType.ROOM_UPDATED, room=snapshot)


async def notify_player_joined(room: Room, player_id: UUID, player_name: str) -> None:
    snapshot = RoomResponse.from_room(room).model_dump(mode="json")
    await room_manager.broadcast(
        room.code,
        EventType.PLAYER_JOINED,
        player_id=str(player_id),
        player_name=player_name,
        room=snapshot,
    )


async def notify_player_left(
    room_code: str, player_id: UUID, player_name: str, room: Room | None = None
) -> None:
    payload: dict[str, object] = {
        "player_id": str(player_id),
        "player_name": player_name,
    }
    if room is not None:
        payload["room"] = RoomResponse.from_room(room).model_dump(mode="json")
        payload["room_deleted"] = False
    else:
        payload["room_deleted"] = True
    await room_manager.broadcast(room_code, EventType.PLAYER_LEFT, **payload)


async def notify_player_kicked(
    room: Room, kicked_id: UUID, kicked_name: str
) -> None:
    """Notify room about a kick, and send PLAYER_KICKED to the kicked user."""
    snapshot = RoomResponse.from_room(room).model_dump(mode="json")
    await room_manager.broadcast(
        room.code,
        EventType.PLAYER_KICKED,
        player_id=str(kicked_id),
        player_name=kicked_name,
        room=snapshot,
    )
    # Also send directly to kicked user so their client can react
    await room_manager.send_to_user(
        room.code,
        kicked_id,
        EventType.PLAYER_KICKED,
        player_id=str(kicked_id),
        reason="You were kicked from the room.",
    )


def fire_and_forget(coro: object) -> None:
    """Schedule an async notification from a sync REST handler."""
    loop = _get_loop()
    if loop is not None and loop.is_running():
        loop.create_task(coro)  # type: ignore[arg-type]
    else:
        logger.debug("No running event loop for WS notification")
