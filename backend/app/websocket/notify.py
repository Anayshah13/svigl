"""
Bridge between REST mutations / sweeper and WebSocket broadcasts.

After any room-mutating call (join, leave, kick, transfer-host, eviction),
push the update to connected clients via these helpers.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.models.room import Room
from app.schemas.room import RoomResponse
from app.websocket.connection_manager import connection_manager
from app.websocket.events import EventType, make_event
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)


def _get_loop() -> asyncio.AbstractEventLoop | None:
    try:
        return asyncio.get_running_loop()
    except RuntimeError:
        return None


async def broadcast_room_change(
    room_code: str,
    room: Room | None,
    *,
    player_id: UUID | None = None,
    player_name: str | None = None,
) -> None:
    """
    Unified broadcast for membership mutations.
    Surviving rooms get ROOM_UPDATED with a full snapshot; deleted rooms get
    PLAYER_LEFT + room_deleted so clients clear without a refresh.
    """
    if room is not None:
        snapshot = RoomResponse.from_room(room).model_dump(mode="json")
        await room_manager.broadcast(room_code, EventType.ROOM_UPDATED, room=snapshot)
        return

    payload: dict[str, object] = {"room_deleted": True}
    if player_id is not None:
        payload["player_id"] = str(player_id)
    if player_name is not None:
        payload["player_name"] = player_name
    await room_manager.broadcast(room_code, EventType.PLAYER_LEFT, **payload)


async def notify_room_updated(room: Room) -> None:
    """Broadcast the full room state to all connected clients in that room."""
    await broadcast_room_change(room.code, room)


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
    if room is not None:
        snapshot = RoomResponse.from_room(room).model_dump(mode="json")
        await room_manager.broadcast(
            room_code,
            EventType.PLAYER_LEFT,
            player_id=str(player_id),
            player_name=player_name,
            room=snapshot,
            room_deleted=False,
        )
        return

    await broadcast_room_change(
        room_code,
        None,
        player_id=player_id,
        player_name=player_name,
    )


async def notify_player_kicked(
    room: Room, kicked_id: UUID, kicked_name: str
) -> None:
    """
    Notify the room about a kick, deliver a direct message (with room snapshot)
    to the kicked user, then remove them from the in-memory room channel.
    """
    snapshot = RoomResponse.from_room(room).model_dump(mode="json")

    await room_manager.broadcast(
        room.code,
        EventType.PLAYER_KICKED,
        player_id=str(kicked_id),
        player_name=kicked_name,
        room=snapshot,
    )

    # Deliver directly via connection registry so the kicked client still gets
    # the payload even if a race already dropped them from the room channel.
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

    await room_manager.disconnect_user(room.code, kicked_id)


def fire_and_forget(coro: object) -> None:
    """Schedule an async notification from a sync REST handler."""
    loop = _get_loop()
    if loop is not None and loop.is_running():
        loop.create_task(coro)  # type: ignore[arg-type]
    else:
        logger.debug("No running event loop for WS notification")
