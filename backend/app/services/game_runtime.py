"""Per-room authoritative game timers."""

from __future__ import annotations

import asyncio
import logging
from math import ceil
from uuid import UUID

from app.db.session import SessionLocal
from app.models.room import GAME_PHASE_LOBBY, GameSession, Room
from app.schemas.room import RoomResponse
from app.services.game import (
    ACTIVE_PHASES,
    GameMutation,
    active_sessions,
    advance_due_session,
    utcnow,
)
from app.services.room import _aware
from app.websocket.notify import (
    broadcast_game_events_async,
    broadcast_timer_async,
    fire_and_forget,
)

logger = logging.getLogger(__name__)


def _load_session_ticks() -> list[tuple[UUID, str, GameMutation | None, dict | None]]:
    db = SessionLocal()
    try:
        results: list[tuple[UUID, str, GameMutation | None, dict | None]] = []
        for session_id, code in active_sessions(db):
            mutation = advance_due_session(db, session_id)
            snapshot = None
            if mutation is not None:
                room = db.query(Room).filter(Room.code == code).first()
                if room is not None:
                    snapshot = RoomResponse.from_room(room).model_dump(mode="json")
            results.append((session_id, code, mutation, snapshot))
        return results
    finally:
        db.close()


class GameRuntime:
    def __init__(self) -> None:
        self._locks: dict[str, asyncio.Lock] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._session_by_room: dict[str, UUID] = {}
        self._global_lock = asyncio.Lock()

    def _lock_for(self, room_code: str) -> asyncio.Lock:
        code = room_code.upper()
        lock = self._locks.get(code)
        if lock is None:
            lock = asyncio.Lock()
            self._locks[code] = lock
        return lock

    async def run_serialized(self, room_code: str, fn):  # noqa: ANN001
        async with self._lock_for(room_code):
            return await asyncio.to_thread(fn)

    def schedule(self, room_code: str, session_id: UUID) -> None:
        fire_and_forget(self._schedule_async(room_code.upper(), session_id))

    def stop(self, room_code: str) -> None:
        fire_and_forget(self._stop_async(room_code.upper()))

    async def _schedule_async(self, room_code: str, session_id: UUID) -> None:
        async with self._global_lock:
            self._session_by_room[room_code] = session_id
            existing = self._tasks.get(room_code)
            if existing is not None and not existing.done():
                return
            self._tasks[room_code] = asyncio.create_task(
                self._monitor_room(room_code),
                name=f"game-timer-{room_code}",
            )
            logger.info(
                "game_runtime scheduled room=%s session=%s", room_code, session_id
            )

    async def _stop_async(self, room_code: str) -> None:
        async with self._global_lock:
            self._session_by_room.pop(room_code, None)
            task = self._tasks.pop(room_code, None)
            if task is not None and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    async def recover_active_sessions(self) -> None:
        rows = await asyncio.to_thread(_load_session_ticks)
        for session_id, code, mutation, snapshot in rows:
            if mutation is not None and snapshot is not None:
                await broadcast_game_events_async(mutation, snapshot)
                if mutation.stop_timer:
                    await self._stop_async(code)
                    continue
            self.schedule(code, session_id)
        logger.info("game_runtime recovered %s active session(s)", len(rows))

    async def reconcile_due_sessions(self) -> int:
        """Sweeper safety net: advance overdue sessions and restart dead monitors."""
        rows = await asyncio.to_thread(_load_session_ticks)
        advanced = 0
        for session_id, code, mutation, snapshot in rows:
            if mutation is not None and snapshot is not None:
                advanced += 1
                apply_mutation_side_effects(mutation)
                await broadcast_game_events_async(mutation, snapshot)
                if mutation.stop_timer:
                    continue
            existing = self._tasks.get(code.upper())
            if existing is None or existing.done():
                if mutation is None or not mutation.stop_timer:
                    self.schedule(code, session_id)
        if advanced:
            logger.info("game_runtime reconciled %s overdue session(s)", advanced)
        return advanced

    async def _monitor_room(self, room_code: str) -> None:
        try:
            while True:
                session_id = self._session_by_room.get(room_code)
                if session_id is None:
                    return

                try:
                    async with self._lock_for(room_code):
                        outcome = await asyncio.to_thread(
                            self._tick_session, room_code, session_id
                        )
                except Exception:
                    logger.exception(
                        "game_runtime tick failed room=%s session=%s",
                        room_code,
                        session_id,
                    )
                    await asyncio.sleep(1)
                    continue

                if outcome is None:
                    return

                mutation, remaining, phase, revision, deadline_at = outcome
                if mutation is not None:
                    snapshot = await asyncio.to_thread(self._snapshot_room, room_code)
                    if snapshot is not None:
                        await broadcast_game_events_async(mutation, snapshot)
                    if mutation.stop_timer:
                        await self._stop_async(room_code)
                        return
                    if mutation.session_id is not None:
                        self._session_by_room[room_code] = mutation.session_id

                if remaining is not None and phase is not None and revision is not None:
                    await broadcast_timer_async(
                        room_code,
                        remaining_seconds=remaining,
                        phase=phase,
                        revision=revision,
                        deadline_at=deadline_at,
                    )

                await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("game_runtime monitor crashed room=%s", room_code)
        finally:
            async with self._global_lock:
                current = self._tasks.get(room_code)
                if current is not None and current is asyncio.current_task():
                    self._tasks.pop(room_code, None)

    def _tick_session(
        self, room_code: str, session_id: UUID
    ) -> tuple[GameMutation | None, int | None, str | None, int | None, str | None] | None:
        db = SessionLocal()
        try:
            mutation = advance_due_session(db, session_id)
            session = (
                db.query(GameSession).filter(GameSession.id == session_id).first()
            )
            if session is None or session.phase == GAME_PHASE_LOBBY:
                self._session_by_room.pop(room_code, None)
                if mutation is None:
                    return None
                return (
                    mutation,
                    None,
                    GAME_PHASE_LOBBY if session is not None else None,
                    session.revision if session is not None else None,
                    None,
                )

            remaining = None
            deadline_iso = None
            if session.deadline_at is not None:
                remaining = max(
                    0,
                    ceil((_aware(session.deadline_at) - utcnow()).total_seconds()),
                )
                deadline_iso = _aware(session.deadline_at).isoformat()

            return (
                mutation,
                remaining,
                session.phase,
                session.revision,
                deadline_iso,
            )
        finally:
            db.close()

    @staticmethod
    def _snapshot_room(room_code: str) -> dict | None:
        db = SessionLocal()
        try:
            room = db.query(Room).filter(Room.code == room_code.upper()).first()
            if room is None:
                return None
            return RoomResponse.from_room(room).model_dump(mode="json")
        finally:
            db.close()


game_runtime = GameRuntime()


def apply_mutation_side_effects(mutation: GameMutation | None) -> None:
    if mutation is None:
        return
    if mutation.stop_timer:
        game_runtime.stop(mutation.room_code)
        return
    if mutation.session_id is not None and mutation.phase in ACTIVE_PHASES:
        game_runtime.schedule(mutation.room_code, mutation.session_id)


def reconcile_room_session(db, room) -> GameMutation | None:  # noqa: ANN001
    """Advance an overdue session when serving REST (refresh / presence)."""
    session = getattr(room, "game_session", None)
    if session is None or session.phase == GAME_PHASE_LOBBY:
        return None
    if session.deadline_at is None:
        return None
    if _aware(session.deadline_at) > utcnow():
        return None
    mutation = advance_due_session(db, session.id)
    if mutation is not None:
        db.refresh(session)
        if hasattr(room, "status"):
            db.refresh(room)
    return mutation
