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
from app.services.canvas import (
    CanvasBroadcast,
    CanvasError,
    apply_canvas_cleared,
    apply_redo,
    apply_shape_created,
    apply_shape_deleted,
    apply_shape_updated,
    apply_undo,
    get_canvas_snapshot,
)
from app.services.game import (
    GameError,
    select_word,
    set_player_ready,
    start_game,
    submit_chat,
    update_game_settings,
)
from app.services.game_runtime import apply_mutation_side_effects, game_runtime
from app.services.room import (
    _load_room,
    ensure_room_game_defaults,
    touch_membership_presence,
)
from app.websocket.connection_manager import ConnectedClient
from app.websocket.events import EventType, WSMessage, make_event
from app.websocket.notify import broadcast_game_events_async
from app.websocket.room_manager import room_manager

logger = logging.getLogger(__name__)


async def handle_message(client: ConnectedClient, message: WSMessage) -> None:
    """Route an incoming message to the correct handler."""
    handler = _HANDLERS.get(message.type)
    if handler is None:
        await _send_error(
            client.websocket,
            f"Unknown event type: {message.type}",
            code="UNKNOWN",
        )
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


async def _send_canvas_snapshot(client: ConnectedClient, room_code: str) -> None:
    """Authoritative Postgres snapshot for mid-round join / reconnect."""
    db = SessionLocal()
    try:
        snapshot = get_canvas_snapshot(db, room_code, user_id=client.user_id)
    finally:
        db.close()
    await client.websocket.send_text(
        make_event(EventType.CANVAS_SNAPSHOT, **snapshot)
    )


async def _handle_join_room(client: ConnectedClient, message: WSMessage) -> None:
    raw_code = message.payload.get("room_code")
    if not raw_code or not isinstance(raw_code, str):
        await _send_error(client.websocket, "room_code is required", code="UNKNOWN")
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
                make_event(
                    EventType.ERROR,
                    detail="Not a member of this room",
                    code="NOT_A_MEMBER",
                )
            )
            await client.websocket.close(code=4004, reason="Not a member of this room")
            return

        membership.last_seen_at = datetime.now(timezone.utc)
        db.commit()

        if client.room_code and client.room_code != room_code:
            await room_manager.disconnect(client)
            client.room_code = None

        if client.room_code == room_code:
            room_obj = _load_room(db, code=room_code)
            if room_obj:
                from app.services.disconnect_grace import cancel_disconnect_grace
                from app.services.game_runtime import reconcile_room_session

                cancel_disconnect_grace(room_code, client.user_id)
                ensure_room_game_defaults(db, room_obj, commit=True)
                due = reconcile_room_session(db, room_obj)
                if due is not None:
                    apply_mutation_side_effects(due)
                snapshot = RoomResponse.from_room(
                    room_obj, viewer_id=client.user_id
                ).model_dump(mode="json")
                await client.websocket.send_text(
                    make_event(EventType.ROOM_UPDATED, room=snapshot)
                )
                await _send_canvas_snapshot(client, room_code)
                if due is not None:
                    await broadcast_game_events_async(due, snapshot)
            return

        room_obj = _load_room(db, code=room_code)
        if room_obj is None:
            await _send_error(client.websocket, "Room not found", code="ROOM_NOT_FOUND")
            return

        ensure_room_game_defaults(db, room_obj, commit=True)
        from app.services.disconnect_grace import cancel_disconnect_grace
        from app.services.game_runtime import reconcile_room_session

        cancel_disconnect_grace(room_code, client.user_id)
        due = reconcile_room_session(db, room_obj)
        if due is not None:
            apply_mutation_side_effects(due)
        snapshot = RoomResponse.from_room(
            room_obj, viewer_id=client.user_id
        ).model_dump(mode="json")
        await room_manager.connect(client, room_code)
        # Authoritative snapshot on JOIN / reconnect.
        await client.websocket.send_text(
            make_event(EventType.ROOM_UPDATED, room=snapshot)
        )
        # One canvas snapshot from Postgres, then live ops.
        await _send_canvas_snapshot(client, room_code)
        if due is not None:
            await broadcast_game_events_async(due, snapshot)
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


async def _mutate_game(client: ConnectedClient, mutate_fn):  # noqa: ANN001
    if client.room_code is None:
        await _send_error(
            client.websocket,
            "Join a room before sending game intents.",
            code="NOT_IN_ROOM",
        )
        return None

    room_code = client.room_code

    def _run():
        db = SessionLocal()
        try:
            mutation = mutate_fn(db, room_code, client.user_id)
            room = _load_room(db, code=room_code)
            if room is not None:
                ensure_room_game_defaults(db, room, commit=False)
            # Public snapshot for room-wide broadcast (no secret word).
            snapshot = (
                RoomResponse.from_room(room).model_dump(mode="json")
                if room is not None
                else None
            )
            return mutation, snapshot
        finally:
            db.close()

    try:
        mutation, snapshot = await game_runtime.run_serialized(room_code, _run)
    except GameError as exc:
        await _send_error(client.websocket, exc.detail, code=exc.code)
        return None
    except Exception:
        logger.exception("game intent failed user=%s room=%s", client.user_id, room_code)
        await _send_error(client.websocket, "Internal server error.", code="UNKNOWN")
        return None

    apply_mutation_side_effects(mutation)
    if snapshot is not None:
        await broadcast_game_events_async(mutation, snapshot)
    return mutation


async def _handle_player_ready(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_game(
        client,
        lambda db, code, user_id: set_player_ready(db, code, user_id, ready=True),
    )


async def _handle_player_unready(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_game(
        client,
        lambda db, code, user_id: set_player_ready(db, code, user_id, ready=False),
    )


async def _handle_host_update_settings(
    client: ConnectedClient, message: WSMessage
) -> None:
    total_rounds = message.payload.get("total_rounds")
    round_duration = message.payload.get("round_duration_seconds")
    if not isinstance(total_rounds, int) or not isinstance(round_duration, int):
        await _send_error(
            client.websocket,
            "total_rounds and round_duration_seconds are required integers.",
            code="UNKNOWN",
        )
        return

    await _mutate_game(
        client,
        lambda db, code, user_id: update_game_settings(
            db,
            code,
            user_id,
            total_rounds=total_rounds,
            round_duration_seconds=round_duration,
        ),
    )


async def _handle_start_game(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_game(client, start_game)


async def _handle_select_word(client: ConnectedClient, message: WSMessage) -> None:
    word = message.payload.get("word")
    if not isinstance(word, str) or not word.strip():
        await _send_error(client.websocket, "word is required.", code="UNKNOWN")
        return
    await _mutate_game(
        client,
        lambda db, code, user_id: select_word(db, code, user_id, word=word),
    )


async def _handle_chat_message(client: ConnectedClient, message: WSMessage) -> None:
    text = message.payload.get("text")
    if text is None:
        text = message.payload.get("message")
    if not isinstance(text, str):
        await _send_error(client.websocket, "text is required.", code="UNKNOWN")
        return
    await _mutate_game(
        client,
        lambda db, code, user_id: submit_chat(db, code, user_id, text=text),
    )


async def _broadcast_canvas(result: CanvasBroadcast) -> None:
    event_type = EventType(result.event)
    if result.exclude_user_id is not None:
        await room_manager.broadcast_except(
            result.room_code,
            result.exclude_user_id,
            event_type,
            **result.payload,
        )
    else:
        await room_manager.broadcast(
            result.room_code,
            event_type,
            **result.payload,
        )


async def _mutate_canvas(client: ConnectedClient, mutate_fn):  # noqa: ANN001
    if client.room_code is None:
        await _send_error(
            client.websocket,
            "Join a room before sending canvas ops.",
            code="NOT_IN_ROOM",
        )
        return

    room_code = client.room_code

    def _run():
        db = SessionLocal()
        try:
            return mutate_fn(db, room_code, client.user_id)
        finally:
            db.close()

    try:
        result: CanvasBroadcast = await game_runtime.run_serialized(room_code, _run)
    except CanvasError as exc:
        await _send_error(client.websocket, exc.detail, code=exc.code)
        return
    except Exception:
        logger.exception(
            "canvas intent failed user=%s room=%s", client.user_id, room_code
        )
        await _send_error(client.websocket, "Internal server error.", code="UNKNOWN")
        return

    await _broadcast_canvas(result)


async def _handle_shape_created(client: ConnectedClient, message: WSMessage) -> None:
    shape = message.payload.get("shape")
    if shape is None:
        await _send_error(client.websocket, "shape is required", code="UNKNOWN")
        return
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_shape_created(db, code, user_id, shape),
    )


async def _handle_shape_updated(client: ConnectedClient, message: WSMessage) -> None:
    shape = message.payload.get("shape")
    if shape is None:
        await _send_error(client.websocket, "shape is required", code="UNKNOWN")
        return
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_shape_updated(db, code, user_id, shape),
    )


async def _handle_shape_deleted(client: ConnectedClient, message: WSMessage) -> None:
    shape_id = message.payload.get("shape_id")
    if not shape_id or not isinstance(shape_id, str):
        await _send_error(client.websocket, "shape_id is required", code="UNKNOWN")
        return
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_shape_deleted(db, code, user_id, shape_id),
    )


async def _handle_canvas_cleared(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_canvas_cleared(db, code, user_id),
    )


async def _handle_undo(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_undo(db, code, user_id),
    )


async def _handle_redo(client: ConnectedClient, _message: WSMessage) -> None:
    await _mutate_canvas(
        client,
        lambda db, code, user_id: apply_redo(db, code, user_id),
    )


async def _handle_canvas_snapshot_request(
    client: ConnectedClient, _message: WSMessage
) -> None:
    """Client may re-request snapshot after reconnect gaps."""
    if client.room_code is None:
        await _send_error(
            client.websocket,
            "Join a room before requesting a canvas snapshot.",
            code="NOT_IN_ROOM",
        )
        return
    await _send_canvas_snapshot(client, client.room_code)


async def _send_error(ws: WebSocket, detail: str, *, code: str = "UNKNOWN") -> None:
    try:
        await ws.send_text(make_event(EventType.ERROR, detail=detail, code=code))
    except Exception:
        pass


_HANDLERS: dict[EventType, object] = {
    EventType.PING: _handle_ping,
    EventType.JOIN_ROOM: _handle_join_room,
    EventType.LEAVE_ROOM: _handle_leave_room,
    EventType.PLAYER_READY: _handle_player_ready,
    EventType.PLAYER_UNREADY: _handle_player_unready,
    EventType.HOST_UPDATE_SETTINGS: _handle_host_update_settings,
    EventType.START_GAME: _handle_start_game,
    EventType.SELECT_WORD: _handle_select_word,
    EventType.CHAT_MESSAGE: _handle_chat_message,
    EventType.SHAPE_CREATED: _handle_shape_created,
    EventType.SHAPE_UPDATED: _handle_shape_updated,
    EventType.SHAPE_DELETED: _handle_shape_deleted,
    EventType.CANVAS_CLEARED: _handle_canvas_cleared,
    EventType.UNDO: _handle_undo,
    EventType.REDO: _handle_redo,
    EventType.CANVAS_SNAPSHOT_REQUEST: _handle_canvas_snapshot_request,
}
