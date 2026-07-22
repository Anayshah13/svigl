"""Tests for Skribbl word selection, guessing, scoring, and secrecy."""

from __future__ import annotations

import json
import os
import uuid
from datetime import timedelta

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
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.room import (
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GAME_PHASE_WORD_SELECTION,
)
from app.models.user import User
from app.schemas.room import RoomResponse
from app.services.game import (
    GameError,
    advance_due_session,
    drawer_points_for_guess,
    guesser_points,
    handle_player_departure,
    maybe_reveal_hint,
    select_word,
    set_player_ready,
    start_game,
    submit_chat,
    utcnow,
)
from app.services.room import create_room, join_room
from app.services.words import is_close_guess, word_hint_mask


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
    )
    db.add(user)
    db.flush()
    return user


def _ready_and_start(db: Session, room_code: str, host_id, users) -> None:
    for user in users:
        set_player_ready(db, room_code, user.id, ready=True)
    start_game(db, room_code, host_id)


def _force_deadline(db: Session, room) -> object:
    db.refresh(room)
    sess = room.game_session
    assert sess is not None
    sess.deadline_at = utcnow() - timedelta(seconds=1)
    db.commit()
    return sess.id


def _enter_word_selection(db: Session, room):
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    return room.game_session


def _enter_round_with_word(db: Session, room, word: str | None = None):
    session = _enter_word_selection(db, room)
    choices = json.loads(session.word_choices_json)
    assert len(choices) == 3
    pick = word if word in choices else choices[0]
    drawer_id = session.drawer_user_id
    mutation = select_word(db, room.code, drawer_id, word=pick)
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    db.refresh(room)
    return room.game_session, pick, drawer_id


def test_word_choices_private_and_auto_pick(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    session = _enter_word_selection(db, room)
    choices = json.loads(session.word_choices_json)
    public = RoomResponse.from_room(room)
    assert public.game.word_choices is None
    assert public.game.secret_word is None

    drawer_snap = RoomResponse.from_room(room, viewer_id=session.drawer_user_id)
    assert drawer_snap.game.word_choices == choices

    # Timeout auto-picks
    session_id = _force_deadline(db, room)
    mutation = advance_due_session(db, session_id)
    assert mutation is not None
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    assert mutation.private_drawer is not None
    assert mutation.private_drawer.secret_word in choices
    db.refresh(room)
    public = RoomResponse.from_room(room)
    assert public.game.secret_word is None
    assert public.game.word_hint == word_hint_mask(room.game_session.secret_word)
    drawer_snap = RoomResponse.from_room(
        room, viewer_id=room.game_session.drawer_user_id
    )
    assert drawer_snap.game.secret_word == room.game_session.secret_word


def test_select_word_and_guess_scoring(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    session, word, drawer_id = _enter_round_with_word(db, room)
    guesser_id = guest.id if drawer_id == host.id else host.id

    # Drawer cannot guess
    with pytest.raises(GameError) as exc:
        submit_chat(db, room.code, drawer_id, text=word)
    assert exc.value.code == "NOT_ALLOWED"

    mutation = submit_chat(db, room.code, guesser_id, text=word.upper())
    assert "PLAYER_GUESSED" in mutation.events
    assert mutation.chat_events[0].kind == "correct_guess"
    assert word.lower() not in mutation.chat_events[0].message.lower()
    # Only two players → early round end
    assert mutation.phase == GAME_PHASE_ROUND_END
    assert "ROUND_ENDED" in mutation.events

    db.refresh(room)
    guesser = next(p for p in room.game_session.players if p.user_id == guesser_id)
    drawer = next(p for p in room.game_session.players if p.user_id == drawer_id)
    assert guesser.score > 0
    assert drawer.score > 0
    assert guesser.has_guessed_correctly is True

    # Round summary reveals word; public snapshot may include it at ROUND_END
    summary = mutation.round_summary
    assert summary is not None
    assert summary["word"] == word


def test_correct_guessers_chat_privately_without_rescoring(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)

    session, word, drawer_id = _enter_round_with_word(db, room)
    guessers = [u.id for u in (host, guest, third) if u.id != drawer_id]
    first, second = guessers

    mutation = submit_chat(db, room.code, first, text=word)
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    db.refresh(room)
    first_score = next(
        p.score for p in room.game_session.players if p.user_id == first
    )

    # Already-correct players chat privately (including the secret word).
    private = submit_chat(db, room.code, first, text="nice one")
    assert private.chat_events[0].kind == "private_chat"
    assert private.chat_events[0].recipient_ids is not None
    assert first in private.chat_events[0].recipient_ids
    assert drawer_id in private.chat_events[0].recipient_ids
    assert second not in private.chat_events[0].recipient_ids

    db.refresh(room)
    assert (
        next(p.score for p in room.game_session.players if p.user_id == first)
        == first_score
    )

    mutation = submit_chat(db, room.code, second, text=word)
    assert mutation.phase == GAME_PHASE_ROUND_END


def test_earlier_guess_scores_higher(db: Session) -> None:
    early = guesser_points(remaining_seconds=50, duration_seconds=60)
    late = guesser_points(remaining_seconds=5, duration_seconds=60)
    assert early > late
    assert early <= 350
    assert late >= 50


def test_waiting_player_exact_guess_is_private_zero_points(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session, word, drawer_id = _enter_round_with_word(db, room)

    join_room(db, code=room.code, user_id=late.id)
    before_scores = {p.user_id: p.score for p in room.game_session.players}
    mutation = submit_chat(db, room.code, late.id, text=word)
    assert mutation.events == ("CHAT_MESSAGE",)
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    assert len(mutation.chat_events) == 1
    chat = mutation.chat_events[0]
    assert chat.kind == "system"
    assert chat.recipient_ids == (late.id,)
    assert word not in chat.message
    assert "PLAYER_GUESSED" not in mutation.events
    assert "ROUND_ENDED" not in mutation.events
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE
    assert {p.user_id: p.score for p in room.game_session.players} == before_scores
    assert not any(p.has_guessed_correctly for p in room.game_session.players)

    # Ordinary waiting chat stays public.
    public = submit_chat(db, room.code, late.id, text="hello")
    assert public.events == ("CHAT_MESSAGE",)
    assert public.chat_events[0].kind == "chat"
    assert public.chat_events[0].message == "hello"
    assert public.chat_events[0].recipient_ids is None


def test_waiting_player_scores_after_next_drawing_admission(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    late = _user(db, "Late")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    _session, word, drawer_id = _enter_round_with_word(db, room)
    join_room(db, code=room.code, user_id=late.id)

    # Close current drawing and admit late joiner on the next boundary.
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_ROUND_END
    session_id = _force_deadline(db, room)
    assert advance_due_session(db, session_id).phase == GAME_PHASE_WORD_SELECTION
    db.refresh(room)
    assert late.id in {p.user_id for p in room.game_session.players if p.is_active}

    session = room.game_session
    assert session.drawer_user_id is not None
    choices = json.loads(session.word_choices_json)
    next_word = choices[0]
    select_word(db, room.code, session.drawer_user_id, word=next_word)
    db.refresh(room)

    guesser_id = late.id
    if room.game_session.drawer_user_id == late.id:
        # Late joiner became drawer — have an original guess instead.
        guesser_id = guest.id if drawer_id == host.id else host.id
    mutation = submit_chat(db, room.code, guesser_id, text=next_word)
    assert "PLAYER_GUESSED" in mutation.events
    db.refresh(room)
    guesser = next(p for p in room.game_session.players if p.user_id == guesser_id)
    assert guesser.score > 0
    assert guesser.has_guessed_correctly is True


def test_secret_never_in_public_snapshot_during_round(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session, word, drawer_id = _enter_round_with_word(db, room)

    public = RoomResponse.from_room(room).model_dump(mode="json")
    dumped = json.dumps(public)
    assert word not in dumped
    assert public["game"]["secret_word"] is None
    assert public["game"]["word_hint"] is not None

    guesser_id = guest.id if drawer_id == host.id else host.id
    guesser_view = RoomResponse.from_room(room, viewer_id=guesser_id)
    assert guesser_view.game.secret_word is None
    drawer_view = RoomResponse.from_room(room, viewer_id=drawer_id)
    assert drawer_view.game.secret_word == word


def test_drawer_disconnect_during_word_selection(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)
    session = _enter_word_selection(db, room)
    drawer_id = session.drawer_user_id

    mutation = handle_player_departure(db, room, drawer_id)
    db.commit()
    assert mutation is not None
    assert "ROUND_ENDED" in mutation.events
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_END


def test_normal_chat_does_not_reveal_word(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)
    session, word, drawer_id = _enter_round_with_word(db, room)
    guesser_id = guest.id if drawer_id == host.id else host.id

    mutation = submit_chat(db, room.code, guesser_id, text="not the word")
    assert mutation.phase == GAME_PHASE_ROUND_ACTIVE
    assert mutation.chat_events[0].kind == "chat"
    assert mutation.chat_events[0].message == "not the word"


def test_round_end_summary_lists_correct_guessers(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)

    session, word, drawer_id = _enter_round_with_word(db, room)
    guessers = [u.id for u in (host, guest, third) if u.id != drawer_id]
    first, second = guessers

    submit_chat(db, room.code, first, text=word)
    mutation = submit_chat(db, room.code, second, text=word)
    assert mutation.phase == GAME_PHASE_ROUND_END
    summary = mutation.round_summary
    assert summary is not None
    assert summary["word"] == word
    guessed_ids = {entry["player_id"] for entry in summary["guessed"]}
    assert str(first) in guessed_ids
    assert str(second) in guessed_ids
    assert len(summary["guessed"]) == 2

    db.refresh(room)
    public = RoomResponse.from_room(room)
    assert public.game.round_summary is not None
    assert len(public.game.round_summary.guessed) == 2
    assert public.game.round_summary.word == word


def test_close_guess_is_private_to_guesser(db: Session) -> None:
    assert is_close_guess("apple", "appla")
    assert not is_close_guess("apple", "zzzzz")

    host = _user(db, "Host")
    guest = _user(db, "Guest")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    _ready_and_start(db, room.code, host.id, [host, guest])
    db.refresh(room)

    # Force a known secret so closeness is deterministic.
    session = _enter_word_selection(db, room)
    choices = json.loads(session.word_choices_json)
    pick = choices[0]
    drawer_id = session.drawer_user_id
    select_word(db, room.code, drawer_id, word=pick)
    db.refresh(room)
    room.game_session.secret_word = "apple"
    db.commit()
    db.refresh(room)

    guesser_id = guest.id if drawer_id == host.id else host.id
    mutation = submit_chat(db, room.code, guesser_id, text="appla")
    kinds = {event.kind for event in mutation.chat_events}
    assert "close_guess" in kinds
    assert "chat" in kinds
    close = next(e for e in mutation.chat_events if e.kind == "close_guess")
    assert close.recipient_ids == (guesser_id,)
    assert "close" in close.message.lower()


def test_hint_progression_reveals_letters(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)

    session, word, drawer_id = _enter_round_with_word(db, room)
    session.round_started_at = utcnow() - timedelta(seconds=30)
    session.round_duration_seconds = 60
    db.commit()

    mutation = maybe_reveal_hint(db, session.id)
    assert mutation is not None
    assert "HINT_UPDATED" in mutation.events
    hint = mutation.event_extras["HINT_UPDATED"]["word_hint"]
    assert any(ch not in ("_", " ") for ch in hint)

    db.refresh(room)
    guessers = [u.id for u in (host, guest, third) if u.id != drawer_id]
    first, other = guessers
    public = RoomResponse.from_room(room, viewer_id=first)
    assert public.game.word_hint == hint
    assert public.game.secret_word is None

    submit_chat(db, room.code, first, text=word)
    db.refresh(room)
    assert room.game_session.phase == GAME_PHASE_ROUND_ACTIVE
    guessed_view = RoomResponse.from_room(room, viewer_id=first)
    assert guessed_view.game.secret_word == word
    assert "_" not in (guessed_view.game.word_hint or "")
    other_view = RoomResponse.from_room(room, viewer_id=other)
    assert other_view.game.secret_word is None
    assert other_view.game.word_hint == hint


def test_scores_update_on_guess(db: Session) -> None:
    host = _user(db, "Host")
    guest = _user(db, "Guest")
    third = _user(db, "Third")
    room = create_room(db, host_id=host.id, max_players=8)
    join_room(db, code=room.code, user_id=guest.id)
    join_room(db, code=room.code, user_id=third.id)
    _ready_and_start(db, room.code, host.id, [host, guest, third])
    db.refresh(room)

    session, word, drawer_id = _enter_round_with_word(db, room)
    guesser_id = next(u.id for u in (host, guest, third) if u.id != drawer_id)

    mutation = submit_chat(db, room.code, guesser_id, text=word)
    assert "SCORES_UPDATED" in mutation.events
    assert mutation.scores
    by_id = {row["player_id"]: row for row in mutation.scores}
    assert by_id[str(guesser_id)]["score"] > 0
    assert by_id[str(drawer_id)]["score"] > 0
    assert by_id[str(guesser_id)]["has_guessed_correctly"] is True

    early = guesser_points(remaining_seconds=50, duration_seconds=60)
    late = guesser_points(remaining_seconds=5, duration_seconds=60)
    assert early > late
    assert drawer_points_for_guess(remaining_seconds=50, duration_seconds=60) > 0
