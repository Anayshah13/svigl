"""
WebSocket message handlers.

Thin dispatch layer: parses the incoming message type and delegates to
the appropriate handler function.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.room import ROOM_STATUS_FINISHED, Room, RoomPlayer
from app.schemas.room import RoomResponse
from app.services.room import touch_membership_presence
from app.websocket.connection_manager import ConnectedClient
from app.websocket.events import EventType, WSMessage, make_event
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)


async def handle_message(client: ConnectedClient, message: WSMessage) -> None:
    """Route an incoming message to the correct handler."""
    handler = _HANDLERS.get(message.type)
    if handler is None:
        await _send_error(client.websocket, f"Unknown event type: {message.type}")
        return
    await handler(client, message)


async def _handle_ping(client: ConnectedClient, _message: WSMessage) -> None:
    if client.room_code is not None:
        db = SessionLocal()
        try:
            touch_membership_presence(db, client.user_id, client.room_code)
        finally:
            db.close()
    await client.websocket.send_text(make_event(EventType.PONG))


def _get_membership(db: Session, user_id: UUID, room_code: str) -> RoomPlayer | None:
    return (
        db.query(RoomPlayer)
        .join(Room)
        .filter(
            RoomPlayer.user_id == user_id,
            Room.code == room_code,
            Room.status != ROOM_STATUS_FINISHED,
        )
        .first()
    )


async def _handle_join_room(client: ConnectedClient, message: WSMessage) -> None:
    raw_code = message.payload.get("room_code")
    if not raw_code or not isinstance(raw_code, str):
        await _send_error(client.websocket, "room_code is required")
        return

    room_code = raw_code.strip().upper()
    logger.info(
        "WS JOIN_ROOM user=%s room=%s socket=%s",
        client.user_id,
        room_code,
        id(client.websocket),
    )

    db = SessionLocal()
    try:
        membership = _get_membership(db, client.user_id, room_code)
        if not membership:
            await client.websocket.send_text(
                make_event(EventType.ERROR, detail="Not a member of this room")
            )
            await client.websocket.close(code=4004, reason="Not a member of this room")
            return

        membership.last_seen_at = datetime.now(timezone.utc)
        db.commit()

        if client.room_code and client.room_code != room_code:
            await room_manager.disconnect(client)
            client.room_code = None

        if client.room_code == room_code:
            room_obj = db.query(Room).filter(Room.code == room_code).first()
            if room_obj:
                snapshot = RoomResponse.from_room(room_obj).model_dump(mode="json")
                await client.websocket.send_text(
                    make_event(EventType.ROOM_UPDATED, room=snapshot)
                )
            return

        room_obj = db.query(Room).filter(Room.code == room_code).first()
        if room_obj is None:
            await _send_error(client.websocket, "Room not found")
            return

        snapshot = RoomResponse.from_room(room_obj).model_dump(mode="json")
        await room_manager.connect(client, room_code)
        await client.websocket.send_text(make_event(EventType.ROOM_UPDATED, room=snapshot))
    finally:
        db.close()


async def _handle_leave_room(client: ConnectedClient, _message: WSMessage) -> None:
    logger.info(
        "WS LEAVE_ROOM user=%s room=%s socket=%s",
        client.user_id,
        client.room_code,
        id(client.websocket),
    )

    if client.room_code is None:
        await client.websocket.send_text(make_event(EventType.ROOM_LEFT))
        return

    await room_manager.disconnect(client)
    client.room_code = None
    await client.websocket.send_text(make_event(EventType.ROOM_LEFT))


async def _send_error(ws: WebSocket, detail: str) -> None:
    try:
        await ws.send_text(make_event(EventType.ERROR, detail=detail))
    except Exception:
        pass


_HANDLERS: dict[EventType, object] = {
    EventType.PING: _handle_ping,
    EventType.JOIN_ROOM: _handle_join_room,
    EventType.LEAVE_ROOM: _handle_leave_room,
}
