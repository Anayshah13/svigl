"""System robot player: membership, game flow, privacy, and coordinator."""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import timedelta
from types import SimpleNamespace

os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session")
os.environ.setdefault("JWT_SECRET", "test-jwt")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.canvas import CanvasState  # noqa: F401
from app.models.drawing import Drawing, DrawingReaction  # noqa: F401
from app.models.room import (
    GAME_PHASE_COUNTDOWN,
    GAME_PHASE_LOBBY,
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_WORD_SELECTION,
)
from app.models.user import User
from app.schemas.canvas import parse_shape
from app.schemas.room import RoomResponse
from app.services.ai_guesser import AiGuesserError
from app.config import settings
from app.services.bot import (
    BOT_DISPLAY_NAME,
    BOT_PROVIDER,
    BOT_PROVIDER_ID,
    add_room_bot,
    get_or_create_robo_user,
    remove_room_bot,
    room_bot_membership,
    room_has_bot,
)
from app.services.bot_coordinator import BotCoordinator
from app.services.bot_draw import build_bot_drawing
from app.services.canvas import apply_shape_created, get_canvas_snapshot
from app.services.game import (
    advance_due_session,
    select_word,
    set_player_ready,
    start_game,
    submit_chat,
    utcnow,
)
from app.services.room import create_room, join_room, leave_room, transfer_host


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def _user(db: Session, name: str) -> User:
    user = User(
        id=uuid.uuid4(),
        provider="guest",
        provider_id=str(uuid.uuid4()),
        email=None,
        name=name,
        avatar_url=None,
        is_bot=False,
    )
    db.add(user)
    db.flush()
    return user


def _add_bot(db: Session, room, host: User):
    change = add_room_bot(db, room.code, host.id)
    assert change.room is not None
    db.refresh(change.room)
    return change.room


def _force_deadline(db: Session, room) -> object:
    db.refresh(room)
    sess = room.game_session
    assert sess is not None
    sess.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    return sess.id


def test_existing_system_bot_is_renamed_to_anai(db: Session) -> None:
    leftover = User(
        provider=BOT_PROVIDER,
        provider_id=BOT_PROVIDER_ID,
        email=None,
        name="Robo",
        avatar_url=None,
        is_bot=True,
    )
    db.add(leftover)
    db.flush()

    bot = get_or_create_robo_user(db)
    assert bot.id == leftover.id
    assert bot.name == BOT_DISPLAY_NAME


def test_add_bot_ready_counts_for_capacity_and_start(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=2)
    room = _add_bot(db, room, host)

    bot = room_bot_membership(room)
    assert bot is not None
    assert bot.user.is_bot is True
    assert bot.user.name.startswith(BOT_DISPLAY_NAME)
    assert bot.is_ready is True
    assert len(room.players) == 2

    snapshot = RoomResponse.from_room(room)
    assert snapshot.players[-1].is_bot is True
    assert snapshot.can_start is False

    set_player_ready(db, room.code, host.id, ready=True)
    db.refresh(room)
    snapshot = RoomResponse.from_room(room)
    assert snapshot.can_start is True

    mutation = start_game(db, room.code, host.id)
    db.refresh(room)
    assert mutation.phase == GAME_PHASE_COUNTDOWN
    assert len(room.game_session.players) == 2

    extra = _user(db, "Late")
    with pytest.raises(HTTPException) as exc:
        join_room(db, code=room.code, user_id=extra.id)
    assert exc.value.status_code == 409


def test_only_host_can_add_or_remove_bot(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)

    with pytest.raises(HTTPException) as exc:
        add_room_bot(db, room.code, guest.id)
    assert exc.value.status_code == 403

    room = _add_bot(db, room, host)
    assert room_has_bot(room)

    with pytest.raises(HTTPException) as exc:
        remove_room_bot(db, room.code, guest.id)
    assert exc.value.status_code == 403

    change = remove_room_bot(db, room.code, host.id)
    assert change.room is not None
    db.refresh(change.room)
    assert room_has_bot(change.room) is False


def test_bot_cannot_become_host(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None

    with pytest.raises(HTTPException) as exc:
        transfer_host(db, room.code, host.id, bot.user_id)
    assert exc.value.status_code == 409

    leave_room(db, code=room.code, user_id=host.id)
    room = db.get(type(room), room.id)
    # Room object may be expired; reload via guest membership.
    from app.services.room import get_user_active_room

    leftover = get_user_active_room(db, guest.id)
    assert leftover is not None
    assert leftover.host_id == guest.id
    assert leftover.host_id != bot.user_id


def test_bot_stays_ready_after_return_to_lobby(db: Session) -> None:
    from app.services.game import _return_to_lobby

    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    _return_to_lobby(room, room.game_session)
    db.commit()
    db.refresh(room)
    bot = room_bot_membership(room)
    host_member = next(p for p in room.players if p.user_id == host.id)
    assert bot is not None
    assert bot.is_ready is True
    assert host_member.is_ready is False
    assert room.game_session.phase == GAME_PHASE_LOBBY


def test_one_human_plus_bot_survives_until_human_leaves(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    assert len(room.players) == 2
    change = leave_room(db, code=room.code, user_id=host.id)
    assert change.room is None


def test_cannot_add_bot_during_game(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    set_player_ready(db, room.code, host.id, ready=True)
    set_player_ready(db, room.code, guest.id, ready=True)
    start_game(db, room.code, host.id)
    with pytest.raises(HTTPException) as exc:
        add_room_bot(db, room.code, host.id)
    assert exc.value.status_code == 409


def test_duplicate_bot_rejected(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    _add_bot(db, room, host)
    with pytest.raises(HTTPException) as exc:
        add_room_bot(db, room.code, host.id)
    assert exc.value.status_code == 409


def test_bot_rotation_drawing_and_guess_scoring(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    session = room.game_session
    assert session is not None
    drawer_id = session.drawer_user_id
    assert drawer_id in {host.id, bot.user_id}
    choices = json.loads(session.word_choices_json)
    pick = choices[0]
    select_word(db, room.code, drawer_id, word=pick)
    db.refresh(room)
    session = room.game_session
    assert session.phase == GAME_PHASE_ROUND_ACTIVE
    assert session.secret_word == pick

    public = RoomResponse.from_room(room)
    assert public.game.secret_word is None
    dumped = json.dumps(public.model_dump(mode="json"))
    assert pick not in dumped

    guesser_id = host.id if drawer_id == bot.user_id else bot.user_id
    guessed = submit_chat(db, room.code, guesser_id, text=pick)
    assert "PLAYER_GUESSED" in guessed.events
    db.refresh(room)
    frozen = next(p for p in room.game_session.players if p.user_id == guesser_id)
    assert frozen.has_guessed_correctly is True
    assert frozen.score > 0


def test_bot_drawing_persists_valid_shapes(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = bot.user_id
    db.commit()
    session_id = _force_deadline(db, room)
    advance_due_session(db, session_id)
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, bot.user_id, word=choices[0])
    db.refresh(room)

    shapes = build_bot_drawing(choices[0], str(bot.user_id))
    assert len(shapes) >= 2
    for raw in shapes:
        parsed = parse_shape(raw)
        apply_shape_created(db, room.code, bot.user_id, parsed.model_dump(mode="json"))
    snap = get_canvas_snapshot(db, room.code, user_id=host.id)
    assert len(snap["shapes"]) == len(shapes)
    assert snap["can_draw"] is False


def test_bot_guess_does_not_use_secret_directly(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    session_id = _force_deadline(db, room)
    advance_due_session(db, session_id)
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    secret = choices[0]
    select_word(db, room.code, host.id, word=secret)
    db.refresh(room)

    public = RoomResponse.from_room(room, viewer_id=bot.user_id)
    assert public.game.secret_word is None
    wrong = submit_chat(db, room.code, bot.user_id, text="nottheword")
    assert wrong.phase == GAME_PHASE_ROUND_ACTIVE
    assert all(chat.kind != "correct_guess" for chat in wrong.chat_events)
    db.refresh(room)
    assert room.game_session.secret_word == secret


def _fast_bot_settings() -> None:
    settings.bot_word_select_delay_seconds = 0.01
    settings.bot_draw_step_delay_seconds = 0.01
    settings.bot_guess_debounce_seconds = 0.01
    settings.bot_guess_interval_seconds = 0.05


async def _drain_bot(coord: BotCoordinator, room_code: str) -> None:
    for _ in range(6):
        task = coord._tasks.get(room_code.upper())
        if task is None or task.done():
            await asyncio.sleep(0)
            task = coord._tasks.get(room_code.upper())
            if task is None or task.done():
                return
        await asyncio.wait_for(task, timeout=8)


def test_coordinator_selects_and_draws(db: Session) -> None:
    _fast_bot_settings()
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = bot.user_id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_WORD_SELECTION

    SessionFactory = db.get_bind()
    TestSession = sessionmaker(bind=SessionFactory)
    coord = BotCoordinator(session_factory=TestSession)
    key = coord._inspect_room(room.code)
    assert key is not None and key.role == "select"

    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, bot.user_id, word=choices[0])
    db.refresh(room)
    draw_key = coord._inspect_room(room.code)
    assert draw_key is not None and draw_key.role == "draw"
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE

    for shape in build_bot_drawing(choices[0], str(bot.user_id)):
        apply_shape_created(db, room.code, bot.user_id, shape)
    snap = get_canvas_snapshot(db, room.code)
    assert snap["shapes"]


def test_coordinator_guesses_via_submit_chat(db: Session) -> None:
    _fast_bot_settings()
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    secret = choices[0]
    select_word(db, room.code, host.id, word=secret)
    apply_shape_created(
        db,
        room.code,
        host.id,
        build_bot_drawing(secret, str(host.id))[0],
    )
    db.refresh(room)

    async def fake_guess(_request):
        return SimpleNamespace(
            guesses=[SimpleNamespace(answer=secret, confidence=0.9)]
        )

    TestSession = sessionmaker(bind=db.get_bind())
    coord = BotCoordinator(guess_fn=fake_guess, session_factory=TestSession)

    async def _run() -> None:
        await coord._sync_room(room.code)
        await _drain_bot(coord, room.code)

    asyncio.run(_run())
    db.expire_all()
    db.refresh(room)
    frozen = next(p for p in room.game_session.players if p.user_id == bot.user_id)
    assert frozen.has_guessed_correctly is True
    assert frozen.score > 0


def test_coordinator_ai_failure_does_not_block_round(db: Session) -> None:
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, host.id, word=choices[0])
    apply_shape_created(
        db,
        room.code,
        host.id,
        build_bot_drawing(choices[0], str(host.id))[0],
    )

    async def boom(_request):
        raise AiGuesserError("timeout", "nope", status_code=504)

    TestSession = sessionmaker(bind=db.get_bind())
    coord = BotCoordinator(guess_fn=boom, session_factory=TestSession)

    async def _run() -> None:
        key = coord._inspect_room(room.code)
        assert key is not None
        coord._canvas_dirty[key.room_code] = True
        await coord._guess_once(key)

    asyncio.run(_run())
    db.expire_all()
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE
    deadline = room.game_session.deadline_at
    assert deadline is not None


def test_coordinator_cancels_stale_guess_task(db: Session) -> None:
    started = asyncio.Event()
    cancelled = {"value": False}

    async def slow(_request):
        started.set()
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            cancelled["value"] = True
            raise
        return SimpleNamespace(guesses=[])

    TestSession = sessionmaker(bind=db.get_bind())
    coord = BotCoordinator(guess_fn=slow, session_factory=TestSession)
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, host.id, word=choices[0])
    apply_shape_created(
        db,
        room.code,
        host.id,
        build_bot_drawing(choices[0], str(host.id))[0],
    )

    async def _run() -> None:
        await coord._sync_room(room.code)
        # Force the guess loop past debounce by calling once after marking dirty.
        key = coord._keys[room.code.upper()]
        task = asyncio.create_task(coord._guess_once(key))
        await asyncio.sleep(0.05)
        await coord._cancel_room_async(room.code.upper())
        await asyncio.sleep(0.05)
        assert task.done() or task.cancelled() or coord._keys.get(room.code.upper()) is None

    asyncio.run(_run())
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE


def test_coordinator_skips_guess_when_canvas_is_clean(db: Session) -> None:
    calls = {"n": 0}

    async def fake_guess(_request):
        calls["n"] += 1
        return SimpleNamespace(guesses=[])

    TestSession = sessionmaker(bind=db.get_bind())
    coord = BotCoordinator(guess_fn=fake_guess, session_factory=TestSession)
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, host.id, word=choices[0])
    apply_shape_created(
        db,
        room.code,
        host.id,
        build_bot_drawing(choices[0], str(host.id))[0],
    )

    async def _run() -> None:
        key = coord._inspect_room(room.code)
        assert key is not None
        coord._keys[key.room_code] = key
        await coord._guess_once(key)
        assert calls["n"] == 0
        coord._canvas_dirty[key.room_code] = True
        await coord._guess_once(key)

    asyncio.run(_run())
    assert calls["n"] == 1


def test_overlapping_sync_leaves_one_task(db: Session) -> None:
    _fast_bot_settings()
    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    set_player_ready(db, room.code, host.id, ready=True)
    start_game(db, room.code, host.id)
    db.refresh(room)
    room.game_session.drawer_user_id = host.id
    db.commit()
    advance_due_session(db, _force_deadline(db, room))
    db.refresh(room)
    choices = json.loads(room.game_session.word_choices_json)
    select_word(db, room.code, host.id, word=choices[0])
    apply_shape_created(
        db,
        room.code,
        host.id,
        build_bot_drawing(choices[0], str(host.id))[0],
    )

    async def slow(_request):
        await asyncio.sleep(2)
        return SimpleNamespace(guesses=[])

    TestSession = sessionmaker(bind=db.get_bind())
    coord = BotCoordinator(guess_fn=slow, session_factory=TestSession)

    async def _run() -> None:
        await asyncio.gather(
            coord._sync_room(room.code),
            coord._sync_room(room.code),
            coord._sync_room(room.code),
        )
        await asyncio.sleep(0)
        live = [
            task
            for task in coord._tasks.values()
            if task is not None and not task.done()
        ]
        assert len(live) == 1
        await coord._cancel_room_async(room.code.upper())

    asyncio.run(_run())


def test_bot_not_evicted_by_stale_presence(db: Session) -> None:
    from app.services.room import evict_stale_players

    host = _user(db, "Host")
    room = create_room(db, host_id=host.id, max_players=8)
    room = _add_bot(db, room, host)
    bot = room_bot_membership(room)
    assert bot is not None
    bot.last_seen_at = utcnow() - timedelta(minutes=10)
    db.commit()
    db.refresh(room)
    change, evicted = evict_stale_players(db, room)
    assert bot.user_id not in evicted
    assert change.room is not None
    assert room_has_bot(change.room)
