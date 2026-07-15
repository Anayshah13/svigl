"""
Short grace window after WebSocket disconnect before leaving the room.

Reload/reconnect within the window keeps membership. Tab close / kill usually
misses reconnect, so the player is removed, host migrates, and drawer turns skip.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

# Long enough for a normal page reload; short enough that closed tabs leave quickly.
DISCONNECT_GRACE_SECONDS = 5

_pending: dict[tuple[str, UUID], asyncio.Task[None]] = {}


def cancel_disconnect_grace(room_code: str, user_id: UUID) -> None:
    key = (room_code.upper(), user_id)
    task = _pending.pop(key, None)
    if task is not None and not task.done():
        task.cancel()


def schedule_disconnect_grace(room_code: str, user_id: UUID) -> None:
    code = room_code.upper()
    cancel_disconnect_grace(code, user_id)

    async def _run() -> None:
        try:
            await asyncio.sleep(DISCONNECT_GRACE_SECONDS)
            from app.websocket.room_manager import room_manager

            room_state = room_manager.get_room(code)
            if room_state is not None and user_id in room_state.clients:
                # Reconnected to the WS room channel — keep membership.
                return
            await _leave_after_grace(code, user_id)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "disconnect_grace failed room=%s user=%s", code, user_id
            )
        finally:
            _pending.pop((code, user_id), None)

    _pending[(code, user_id)] = asyncio.create_task(
        _run(), name=f"disconnect-grace:{code}:{user_id}"
    )


async def _leave_after_grace(room_code: str, user_id: UUID) -> None:
    from fastapi import HTTPException

    from app.db.session import SessionLocal
    from app.services.game_runtime import apply_mutation_side_effects
    from app.services.room import _load_room, leave_room
    from app.websocket.notify import (
        notify_game_mutation,
        notify_host_changed,
        notify_player_left,
    )
    from app.websocket.room_manager import room_manager

    def _leave():
        db = SessionLocal()
        try:
            room = _load_room(db, code=room_code)
            if room is None:
                return None, "Player"
            member = next(
                (p for p in room.players if p.user_id == user_id), None
            )
            if member is None:
                # Already left via beacon / REST.
                return None, "Player"
            name = member.user.name if member.user is not None else "Player"
            return leave_room(db, code=room_code, user_id=user_id), name
        except HTTPException:
            return None, "Player"
        finally:
            db.close()

    change, player_name = await asyncio.to_thread(_leave)
    if change is None:
        return

    apply_mutation_side_effects(change.game_mutation)
    await room_manager.disconnect_user(room_code, user_id)

    if change.room is None:
        notify_player_left(room_code, user_id, player_name)
        return

    notify_player_left(room_code, user_id, player_name, change.room)
    notify_game_mutation(change.game_mutation, change.room)
    if change.host_changed and change.previous_host_id is not None:
        notify_host_changed(change.room, change.previous_host_id)
    logger.info(
        "disconnect_grace evicted room=%s user=%s host_changed=%s",
        room_code,
        user_id,
        change.host_changed,
    )
