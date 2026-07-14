"""
Background sweeper for stale room memberships.

Runs on a fixed interval so empty / ghost rooms are cleaned up even when no
client is calling presence endpoints.
"""

from __future__ import annotations

import asyncio
import logging

from app.db.session import SessionLocal
from app.schemas.room import RoomResponse
from app.services.room import sweep_stale_rooms
from app.websocket.notify import broadcast_room_change_async

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 15


def _sweep_and_snapshot() -> list[tuple[str, dict | None, list]]:
    """Run eviction in a worker thread; return JSON-safe payloads."""
    db = SessionLocal()
    try:
        changes = sweep_stale_rooms(db)
        payloads: list[tuple[str, dict | None, list]] = []
        for room_code, room, evicted in changes:
            snapshot = (
                RoomResponse.from_room(room).model_dump(mode="json")
                if room is not None
                else None
            )
            payloads.append((room_code, snapshot, evicted))
        return payloads
    finally:
        db.close()


async def sweep_stale_memberships() -> None:
    try:
        changes = await asyncio.to_thread(_sweep_and_snapshot)
        for room_code, snapshot, evicted in changes:
            logger.info(
                "room_sweeper evicted room=%s count=%s deleted=%s",
                room_code,
                len(evicted),
                snapshot is None,
            )
            await broadcast_room_change_async(
                room_code,
                snapshot,
                player_id=evicted[0] if evicted else None,
            )
    except Exception:
        logger.exception("room_sweeper failed")


async def run_room_sweeper(stop_event: asyncio.Event) -> None:
    """Loop until stop_event is set, sweeping every SWEEP_INTERVAL_SECONDS."""
    logger.info("room_sweeper started interval=%ss", SWEEP_INTERVAL_SECONDS)
    while not stop_event.is_set():
        await sweep_stale_memberships()
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=SWEEP_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass
    logger.info("room_sweeper stopped")
