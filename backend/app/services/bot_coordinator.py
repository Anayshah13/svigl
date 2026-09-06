"""Server-side robot player — no fake browser or WebSocket client."""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable
from uuid import UUID

from app.config import settings
from app.db.session import SessionLocal
from app.models.room import GAME_PHASE_LOBBY, GAME_PHASE_ROUND_ACTIVE, Room
from app.schemas.ai_guesser import AiGuessRequest
from app.schemas.room import RoomResponse
from app.services.ai_guesser import AiGuesserError, generate_guess
from app.services.bot import room_bot_membership
from app.services.bot_canvas_image import render_shapes_png
from app.services.canvas import get_canvas_snapshot
from app.services.game import GameError, GameMutation, submit_chat
from app.services.game_runtime import apply_mutation_side_effects, game_runtime
from app.services.words import normalize_guess
from app.websocket.notify import fire_and_forget

logger = logging.getLogger(__name__)


GuessFn = Callable[[AiGuessRequest], Awaitable[Any]]


@dataclass(frozen=True)
class BotTurnKey:
    room_code: str
    session_id: UUID | None
    turn: int
    phase: str
    role: str
    bot_id: UUID


class BotCoordinator:
    def __init__(
        self,
        *,
        guess_fn: GuessFn | None = None,
        session_factory: Callable[[], Any] | None = None,
    ) -> None:
        self._guess_fn = guess_fn or generate_guess
        self._session_factory = session_factory or SessionLocal
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._keys: dict[str, BotTurnKey] = {}
        self._guessed: dict[str, set[str]] = {}
        self._ai_calls: dict[str, int] = {}
        self._canvas_dirty: dict[str, bool] = {}
        self._gates: dict[str, asyncio.Lock] = {}
        self._canvas_events: dict[str, asyncio.Event] = {}
        self._ai_sema = asyncio.Semaphore(max(1, settings.bot_global_ai_concurrency))

    def notify_mutation(self, mutation: GameMutation | None) -> None:
        if mutation is None:
            return
        fire_and_forget(self._sync_room(mutation.room_code))

    def notify_canvas(self, room_code: str) -> None:
        code = room_code.upper()
        self._canvas_dirty[code] = True
        event = self._canvas_events.get(code)
        if event is not None:
            event.set()
        key = self._keys.get(code)
        if key is not None and key.role == "guess":
            return
        fire_and_forget(self._sync_room(code))

    def cancel_room(self, room_code: str) -> None:
        fire_and_forget(self._cancel_room_async(room_code.upper()))

    def _gate(self, room_code: str) -> asyncio.Lock:
        return self._gates.setdefault(room_code, asyncio.Lock())

    def _canvas_event(self, room_code: str) -> asyncio.Event:
        return self._canvas_events.setdefault(room_code, asyncio.Event())

    def _detach_room(self, room_code: str) -> asyncio.Task[None] | None:
        """Drop room bookkeeping and cancel its task without awaiting."""
        task = self._tasks.pop(room_code, None)
        self._keys.pop(room_code, None)
        self._guessed.pop(room_code, None)
        self._ai_calls.pop(room_code, None)
        self._canvas_dirty.pop(room_code, None)
        event = self._canvas_events.pop(room_code, None)
        if event is not None:
            event.set()
        current = asyncio.current_task()
        if task is not None and not task.done() and task is not current:
            task.cancel()
            return task
        return None

    async def _cancel_room_async(self, room_code: str) -> None:
        leftover = self._detach_room(room_code)
        if leftover is not None:
            try:
                await leftover
            except asyncio.CancelledError:
                pass

    async def _sync_room(self, room_code: str) -> None:
        code = room_code.upper()
        leftover: asyncio.Task[None] | None = None
        async with self._gate(code):
            desired = await asyncio.to_thread(self._inspect_room, code)
            current = self._keys.get(code)
            if desired is None:
                leftover = self._detach_room(code)
            elif (
                current == desired
                and code in self._tasks
                and not self._tasks[code].done()
            ):
                return
            else:
                leftover = self._detach_room(code)
                self._keys[code] = desired
                self._guessed.setdefault(code, set())
                self._ai_calls.setdefault(code, 0)
                self._canvas_dirty[code] = True
                self._canvas_event(code).set()
                if desired.role == "guess":
                    self._tasks[code] = asyncio.create_task(
                        self._guess_turn(desired), name=f"bot-guess-{code}"
                    )
        if leftover is not None:
            try:
                await leftover
            except asyncio.CancelledError:
                pass

    def _inspect_room(self, room_code: str) -> BotTurnKey | None:
        db = self._session_factory()
        try:
            room = db.query(Room).filter(Room.code == room_code.upper()).first()
            if room is None:
                return None
            membership = room_bot_membership(room)
            session = room.game_session
            if membership is None or session is None or session.phase == GAME_PHASE_LOBBY:
                return None
            bot_id = membership.user_id
            frozen = next(
                (p for p in session.players if p.user_id == bot_id),
                None,
            )
            if frozen is None or not frozen.is_active:
                return None
            if (
                session.phase == GAME_PHASE_ROUND_ACTIVE
                and session.drawer_user_id != bot_id
                and not frozen.has_guessed_correctly
            ):
                return BotTurnKey(
                    room_code, session.id, session.current_turn, session.phase, "guess", bot_id
                )
            return None
        finally:
            db.close()

    def _still_current(self, key: BotTurnKey) -> bool:
        return self._keys.get(key.room_code) == key

    async def _guess_turn(self, key: BotTurnKey) -> None:
        try:
            await asyncio.sleep(max(0.05, settings.bot_guess_debounce_seconds))
            while self._still_current(key):
                if self._ai_calls.get(key.room_code, 0) >= settings.bot_max_guess_calls_per_turn:
                    return
                await self._guess_once(key)
                if not self._still_current(key):
                    return
                event = self._canvas_event(key.room_code)
                event.clear()
                if self._canvas_dirty.get(key.room_code):
                    continue
                try:
                    await asyncio.wait_for(
                        event.wait(),
                        timeout=max(0.2, settings.bot_guess_interval_seconds),
                    )
                except TimeoutError:
                    pass
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("bot guess loop failed room=%s", key.room_code)

    async def _guess_once(self, key: BotTurnKey) -> None:
        if not self._canvas_dirty.get(key.room_code, False):
            return
        snapshot = await asyncio.to_thread(self._canvas_and_state, key)
        if snapshot is None:
            return
        shapes, already, drawing_version = snapshot
        if already:
            await self._cancel_room_async(key.room_code)
            return
        if not shapes:
            self._canvas_dirty[key.room_code] = False
            return
        # Consume the dirty bit only once we have ink to send. Failures
        # restore it so the same board can be retried after the interval.
        self._canvas_dirty[key.room_code] = False

        previous = sorted(self._guessed.get(key.room_code, set()))
        png = render_shapes_png(shapes)
        image_b64 = base64.b64encode(png).decode("ascii")
        request = AiGuessRequest(
            image_base64=image_b64,
            mime_type="image/png",
            drawing_version=drawing_version,
            mode="game",
            previous_guesses=previous,
        )

        try:
            async with self._ai_sema:
                if not self._still_current(key):
                    return
                async with asyncio.timeout(settings.bot_guess_timeout_seconds):
                    response = await self._guess_fn(request)
        except AiGuesserError as exc:
            self._canvas_dirty[key.room_code] = True
            logger.info("bot AI guess skipped room=%s code=%s", key.room_code, exc.code)
            return
        except TimeoutError:
            self._canvas_dirty[key.room_code] = True
            logger.info("bot AI guess timed out room=%s", key.room_code)
            return
        except Exception:
            self._canvas_dirty[key.room_code] = True
            logger.exception("bot AI guess failed room=%s", key.room_code)
            return

        self._ai_calls[key.room_code] = self._ai_calls.get(key.room_code, 0) + 1
        guesses = getattr(response, "guesses", None) or []
        seen = self._guessed.setdefault(key.room_code, set())

        for item in guesses:
            answer = getattr(item, "answer", "")
            confidence = float(getattr(item, "confidence", 0.0) or 0.0)
            cleaned = normalize_guess(str(answer))
            if not cleaned or cleaned in seen:
                continue
            if confidence < settings.bot_guess_min_confidence:
                continue
            mutation = await self._submit_guess(key, cleaned)
            if mutation is None:
                continue
            seen.add(cleaned)
            await self._publish_mutation(mutation)
            if any(chat.kind == "correct_guess" for chat in mutation.chat_events):
                await self._cancel_room_async(key.room_code)
                return
            # One public chat line per AI call avoids flooding.
            return

    def _canvas_and_state(
        self, key: BotTurnKey
    ) -> tuple[list[dict[str, Any]], bool, int] | None:
        db = self._session_factory()
        try:
            room = db.query(Room).filter(Room.code == key.room_code).first()
            if room is None or room.game_session is None:
                return None
            session = room.game_session
            if session.phase != GAME_PHASE_ROUND_ACTIVE:
                return None
            frozen = next(
                (p for p in session.players if p.user_id == key.bot_id),
                None,
            )
            if frozen is None or frozen.has_guessed_correctly:
                return [], True, 0
            snap = get_canvas_snapshot(db, key.room_code, user_id=key.bot_id)
            shapes = snap.get("shapes") if isinstance(snap, dict) else []
            if not isinstance(shapes, list):
                shapes = []
            return (
                shapes,
                False,
                int(snap.get("op_seq") or 0) if isinstance(snap, dict) else 0,
            )
        finally:
            db.close()

    async def _submit_guess(self, key: BotTurnKey, text: str) -> GameMutation | None:
        def _run() -> GameMutation | None:
            db = self._session_factory()
            try:
                return submit_chat(db, key.room_code, key.bot_id, text=text)
            except GameError as exc:
                logger.info(
                    "bot chat skipped room=%s code=%s", key.room_code, exc.code
                )
                return None
            finally:
                db.close()

        return await game_runtime.run_serialized(key.room_code, _run)

    async def _publish_mutation(self, mutation: GameMutation) -> None:
        from app.websocket.notify import broadcast_game_events_async

        apply_mutation_side_effects(mutation)

        def _snap() -> dict[str, Any] | None:
            db = self._session_factory()
            try:
                room = db.query(Room).filter(Room.code == mutation.room_code).first()
                if room is None:
                    return None
                return RoomResponse.from_room(room).model_dump(mode="json")
            finally:
                db.close()

        try:
            snapshot = await asyncio.to_thread(_snap)
            if snapshot is not None:
                await broadcast_game_events_async(
                    mutation, snapshot, notify_bot=False
                )
        except Exception:
            logger.exception(
                "bot mutation broadcast failed room=%s", mutation.room_code
            )
        await self._sync_room(mutation.room_code)


bot_coordinator = BotCoordinator()
