"""
WebSocket endpoint — one authenticated connection per user.

Room membership changes via JOIN_ROOM / LEAVE_ROOM events on the same socket.
REST remains responsible for create/join/leave room. WS disconnect does NOT
remove DB membership — that happens via explicit leave/kick or grace eviction.
"""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.session import SessionLocal
from app.websocket.auth import authenticate_websocket
from app.websocket.connection_manager import ConnectedClient, connection_manager
from app.websocket.events import EventType, make_event, parse_client_message
from app.websocket.handlers import handle_message
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)

router = APIRouter()

HEARTBEAT_TIMEOUT_SECONDS = 30


async def _handle_ws_disconnect(client: ConnectedClient) -> None:
    """
    Leave the in-memory room channel only.

    DB membership is preserved so refresh / brief network loss can reconnect
    within the presence grace window without host migration or rejoin churn.
    """
    if client.room_code is None:
        return

    await room_manager.disconnect(client)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    socket_id = id(websocket)
    logger.info("WS socket_created socket_id=%s", socket_id)

    db = SessionLocal()
    try:
        user = authenticate_websocket(websocket, db)
        if user is None:
            logger.info("WS auth_failed socket_id=%s", socket_id)
            await websocket.send_text(
                make_event(EventType.ERROR, detail="Authentication failed")
            )
            await websocket.close(code=4003, reason="Authentication failed")
            return
    finally:
        db.close()

    client = ConnectedClient(
        websocket=websocket,
        user_id=user.id,
        user_name=user.name,
        avatar_url=user.avatar_url,
        room_code=None,
    )

    evicted = await connection_manager.register(client)
    if evicted is not None:
        logger.info(
            "WS replaced_existing user=%s old_socket=%s new_socket=%s",
            user.id,
            id(evicted.websocket),
            socket_id,
        )

    logger.info("WS connected user=%s socket_id=%s room=None", user.id, socket_id)

    last_heartbeat = time.monotonic()

    async def _check_heartbeat() -> None:
        nonlocal last_heartbeat
        while True:
            await asyncio.sleep(HEARTBEAT_TIMEOUT_SECONDS / 2)
            if time.monotonic() - last_heartbeat > HEARTBEAT_TIMEOUT_SECONDS:
                logger.info(
                    "WS heartbeat_timeout user=%s socket_id=%s room=%s",
                    user.id,
                    socket_id,
                    client.room_code,
                )
                try:
                    await websocket.close(code=4008, reason="Heartbeat timeout")
                except Exception:
                    pass
                return

    heartbeat_task = asyncio.create_task(_check_heartbeat())

    try:
        while True:
            raw = await websocket.receive_text()
            last_heartbeat = time.monotonic()

            msg = parse_client_message(raw)
            if msg is None:
                await websocket.send_text(
                    make_event(EventType.ERROR, detail="Invalid message format")
                )
                continue

            await handle_message(client, msg)

    except WebSocketDisconnect:
        logger.info(
            "WS disconnected user=%s socket_id=%s room=%s reason=WebSocketDisconnect",
            user.id,
            socket_id,
            client.room_code,
        )
    except Exception:
        logger.exception("WS error user=%s socket_id=%s", user.id, socket_id)
    finally:
        heartbeat_task.cancel()
        await _handle_ws_disconnect(client)
        await connection_manager.unregister(client)
        logger.info(
            "WS socket_destroyed user=%s socket_id=%s",
            user.id,
            socket_id,
        )
