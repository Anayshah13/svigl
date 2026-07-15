from __future__ import annotations

import json
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.room import (
    GAME_PHASE_COUNTDOWN,
    GAME_PHASE_GAME_FINISHED,
    GAME_PHASE_LOBBY,
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GAME_PHASE_WORD_SELECTION,
    ROOM_STATUS_PLAYING,
    ROOM_STATUS_WAITING,
    GameSession,
    GameSessionPlayer,
    Room,
    RoomPlayer,
)
from app.services.words import (
    normalize_guess,
    pick_word_choices,
    word_hint_mask,
    words_match,
)

COUNTDOWN_SECONDS = 3
WORD_SELECTION_SECONDS = 15
ROUND_END_SECONDS = 2
GAME_FINISHED_SECONDS = 5
MIN_ROUND_DURATION = 15
MAX_ROUND_DURATION = 180
MIN_ROUNDS = 1
MAX_ROUNDS = 10
MAX_CHAT_LENGTH = 200

ACTIVE_PHASES = frozenset(
    {
        GAME_PHASE_COUNTDOWN,
        GAME_PHASE_WORD_SELECTION,
        GAME_PHASE_ROUND_ACTIVE,
        GAME_PHASE_ROUND_END,
        GAME_PHASE_GAME_FINISHED,
    }
)


class GameError(Exception):
    """Machine-readable game lifecycle error."""

    def __init__(self, code: str, detail: str, *, status_code: int = 409) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.status_code = status_code


@dataclass(frozen=True)
class ChatEvent:
    kind: str  # "chat" | "system" | "correct_guess"
    message: str
    player_id: str | None = None
    player_name: str | None = None


@dataclass(frozen=True)
class PrivateDrawerPayload:
    user_id: UUID
    word_choices: tuple[str, ...] | None = None
    secret_word: str | None = None


@dataclass(frozen=True)
class GameMutation:
    room_code: str
    events: tuple[str, ...]
    phase: str
    revision: int
    session_id: UUID | None = None
    stop_timer: bool = False
    chat_events: tuple[ChatEvent, ...] = ()
    private_drawer: PrivateDrawerPayload | None = None
    round_summary: dict | None = None
    scores: tuple[dict, ...] = ()
    winner_user_id: UUID | None = None
    # Extra event payload fields merged into WS broadcasts for listed events.
    event_extras: dict[str, dict] = field(default_factory=dict)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _room_for_update(db: Session, room_code: str) -> Room:
    from app.services.room import _load_room, ensure_room_game_defaults

    room = _load_room(db, code=room_code, for_update=True)
    if room is None:
        raise GameError("ROOM_NOT_FOUND", "Room not found.", status_code=404)
    # Do not commit here — caller owns the transaction / row lock.
    return ensure_room_game_defaults(db, room, commit=False)


def _member(room: Room, user_id: UUID) -> RoomPlayer:
    membership = next((item for item in room.players if item.user_id == user_id), None)
    if membership is None:
        raise GameError("NOT_IN_ROOM", "You are not in this room.")
    return membership


def _assert_host(room: Room, user_id: UUID) -> None:
    if room.host_id != user_id:
        raise GameError(
            "NOT_HOST",
            "Only the host can perform this action.",
            status_code=403,
        )


def _ensure_lobby_session(db: Session, room: Room) -> GameSession:
    if room.game_session is not None:
        return room.game_session
    session = GameSession(room_id=room.id, phase=GAME_PHASE_LOBBY)
    db.add(session)
    db.flush()
    room.game_session = session
    return session


def _parse_word_choices(session: GameSession) -> list[str]:
    if not session.word_choices_json:
        return []
    try:
        raw = json.loads(session.word_choices_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(raw, list):
        return []
    return [str(item) for item in raw]


def _set_word_choices(session: GameSession, choices: list[str]) -> None:
    session.word_choices_json = json.dumps(choices)


def _clear_round_word_state(session: GameSession) -> None:
    session.secret_word = None
    session.word_choices_json = None
    session.round_started_at = None


def _reset_round_guess_flags(session: GameSession) -> None:
    for player in session.players:
        player.has_guessed_correctly = False
        player.round_points = 0


def _player_name(room: Room, user_id: UUID) -> str:
    for membership in room.players:
        if membership.user_id == user_id:
            return membership.user.name
    return "Player"


def _scoreboard(session: GameSession) -> tuple[dict, ...]:
    rows = sorted(
        session.players,
        key=lambda item: (-item.score, item.rotation_index),
    )
    return tuple(
        {
            "player_id": str(player.user_id),
            "score": player.score,
            "round_points": player.round_points,
            "has_guessed_correctly": player.has_guessed_correctly,
            "is_active": player.is_active,
        }
        for player in rows
    )


def _pick_winner(session: GameSession) -> UUID | None:
    active = [player for player in session.players if player.is_active]
    if not active:
        active = list(session.players)
    if not active:
        return None
    winner = max(active, key=lambda item: (item.score, -item.rotation_index))
    return winner.user_id


def guesser_points(*, remaining_seconds: float, duration_seconds: int) -> int:
    """Earlier / faster guesses score higher (Skribbl-like 50–350)."""
    if duration_seconds <= 0:
        return 100
    fraction = max(0.0, min(1.0, remaining_seconds / float(duration_seconds)))
    return max(50, int(round(50 + fraction * 300)))


def drawer_points_for_guess(*, remaining_seconds: float, duration_seconds: int) -> int:
    """Drawer earns points for each successful guess."""
    if duration_seconds <= 0:
        return 50
    fraction = max(0.0, min(1.0, remaining_seconds / float(duration_seconds)))
    return max(25, int(round(25 + fraction * 75)))


def set_player_ready(
    db: Session, room_code: str, user_id: UUID, *, ready: bool
) -> GameMutation:
    room = _room_for_update(db, room_code)
    membership = _member(room, user_id)
    session = _ensure_lobby_session(db, room)
    if session.phase != GAME_PHASE_LOBBY:
        raise GameError("ROOM_STARTED", "The game has already started.")
    membership.is_ready = ready
    session.revision += 1
    db.commit()
    return GameMutation(
        room.code,
        ("GAME_STATE_UPDATED",),
        GAME_PHASE_LOBBY,
        session.revision,
        session_id=session.id,
    )


def update_game_settings(
    db: Session,
    room_code: str,
    user_id: UUID,
    *,
    total_rounds: int,
    round_duration_seconds: int,
) -> GameMutation:
    room = _room_for_update(db, room_code)
    _assert_host(room, user_id)
    if not MIN_ROUNDS <= total_rounds <= MAX_ROUNDS:
        raise GameError(
            "UNKNOWN",
            f"total_rounds must be between {MIN_ROUNDS} and {MAX_ROUNDS}.",
            status_code=422,
        )
    if not MIN_ROUND_DURATION <= round_duration_seconds <= MAX_ROUND_DURATION:
        raise GameError(
            "UNKNOWN",
            f"round_duration_seconds must be between {MIN_ROUND_DURATION} "
            f"and {MAX_ROUND_DURATION}.",
            status_code=422,
        )
    session = _ensure_lobby_session(db, room)
    if session.phase != GAME_PHASE_LOBBY:
        raise GameError("ROOM_STARTED", "Settings are locked during a game.")

    room.game_settings.total_rounds = total_rounds
    room.game_settings.round_duration_seconds = round_duration_seconds
    # Keep existing ready flags — settings tweaks should not force re-ready.
    session.revision += 1
    db.commit()
    return GameMutation(
        room.code,
        ("GAME_STATE_UPDATED",),
        GAME_PHASE_LOBBY,
        session.revision,
        session_id=session.id,
    )


def start_game(db: Session, room_code: str, user_id: UUID) -> GameMutation:
    room = _room_for_update(db, room_code)
    _assert_host(room, user_id)
    if len(room.players) < 2:
        raise GameError("UNKNOWN", "At least two players are required.")
    if not all(player.is_ready for player in room.players):
        raise GameError("UNKNOWN", "Every player must be ready.")

    session = _ensure_lobby_session(db, room)
    if session.phase != GAME_PHASE_LOBBY:
        raise GameError("ROOM_STARTED", "The game has already started.")

    settings = room.game_settings
    for frozen_player in list(session.players):
        db.delete(frozen_player)
    db.flush()

    ordered_ids = [player.user_id for player in room.players]
    offset = secrets.randbelow(len(ordered_ids))
    rotated_ids = ordered_ids[offset:] + ordered_ids[:offset]
    for index, player_id in enumerate(rotated_ids):
        db.add(
            GameSessionPlayer(
                session_id=session.id,
                user_id=player_id,
                rotation_index=index,
                is_active=True,
                score=0,
                has_guessed_correctly=False,
                round_points=0,
            )
        )

    session.phase = GAME_PHASE_COUNTDOWN
    session.deadline_at = utcnow() + timedelta(seconds=COUNTDOWN_SECONDS)
    session.revision += 1
    session.current_turn = 0
    session.rotation_start_offset = offset
    session.total_rounds = settings.total_rounds
    session.round_duration_seconds = settings.round_duration_seconds
    session.drawer_user_id = rotated_ids[0]
    session.winner_user_id = None
    _clear_round_word_state(session)
    room.status = ROOM_STATUS_PLAYING
    db.commit()
    return GameMutation(
        room.code,
        ("GAME_STARTED", "COUNTDOWN_STARTED", "GAME_STATE_UPDATED"),
        session.phase,
        session.revision,
        session_id=session.id,
    )


def _active_players(session: GameSession) -> list[GameSessionPlayer]:
    return sorted(
        (player for player in session.players if player.is_active),
        key=lambda item: item.rotation_index,
    )


def _roster_size(session: GameSession) -> int:
    return len(session.players)


def planned_turns(session: GameSession) -> int:
    """Scribble.io: each full round gives every roster player one draw turn."""
    size = _roster_size(session)
    if size == 0:
        return 0
    return session.total_rounds * size


def display_round_number(session: GameSession) -> int:
    """1-indexed full-round number shown in the UI."""
    size = _roster_size(session)
    if size == 0 or session.phase == GAME_PHASE_LOBBY:
        return 0
    if session.phase == GAME_PHASE_GAME_FINISHED:
        return session.total_rounds
    return min(session.total_rounds, (session.current_turn // size) + 1)


def _player_for_turn(
    session: GameSession, turn: int
) -> tuple[int, GameSessionPlayer] | None:
    frozen = sorted(session.players, key=lambda item: item.rotation_index)
    if not frozen:
        return None
    # Scribble.io: total_rounds = full rotations; each player draws once per round.
    limit = planned_turns(session)
    while turn < limit:
        candidate = frozen[turn % len(frozen)]
        if candidate.is_active:
            return turn, candidate
        turn += 1
    return None


def _admit_waiting_players(db: Session, room: Room, session: GameSession) -> list[UUID]:
    """
    Pull mid-game room joiners into the frozen roster (appended to rotation).

    Called at round boundaries so late joiners enter the next round, not the
    next full game.
    """
    existing = {player.user_id for player in session.players}
    next_index = max((player.rotation_index for player in session.players), default=-1) + 1
    admitted: list[UUID] = []
    for membership in room.players:
        if membership.user_id in existing:
            continue
        db.add(
            GameSessionPlayer(
                session_id=session.id,
                user_id=membership.user_id,
                rotation_index=next_index,
                is_active=True,
                score=0,
                has_guessed_correctly=False,
                round_points=0,
            )
        )
        admitted.append(membership.user_id)
        next_index += 1
    if admitted:
        db.flush()
        db.expire(session, ["players"])
    return admitted


def _phase_deadline(seconds: int) -> datetime:
    """Start phase timers from wall clock so clients always see the full duration."""
    return utcnow() + timedelta(seconds=seconds)


def _return_to_lobby(room: Room, session: GameSession) -> None:
    session.phase = GAME_PHASE_LOBBY
    session.deadline_at = None
    session.drawer_user_id = None
    session.current_turn = 0
    session.revision += 1
    session.winner_user_id = None
    _clear_round_word_state(session)
    room.status = ROOM_STATUS_WAITING
    for player in room.players:
        player.is_ready = False
    for frozen in list(session.players):
        frozen.is_active = False
        frozen.has_guessed_correctly = False
        frozen.round_points = 0


def _begin_word_selection(session: GameSession) -> PrivateDrawerPayload:
    """Offer 3 word choices to the current drawer."""
    _reset_round_guess_flags(session)
    _clear_round_word_state(session)
    choices = pick_word_choices(3)
    _set_word_choices(session, choices)
    session.phase = GAME_PHASE_WORD_SELECTION
    session.deadline_at = _phase_deadline(WORD_SELECTION_SECONDS)
    assert session.drawer_user_id is not None
    return PrivateDrawerPayload(
        user_id=session.drawer_user_id,
        word_choices=tuple(choices),
    )


def _begin_round_active(session: GameSession, word: str) -> PrivateDrawerPayload:
    session.secret_word = word
    session.word_choices_json = None
    session.phase = GAME_PHASE_ROUND_ACTIVE
    session.round_started_at = utcnow()
    session.deadline_at = _phase_deadline(session.round_duration_seconds)
    assert session.drawer_user_id is not None
    return PrivateDrawerPayload(
        user_id=session.drawer_user_id,
        secret_word=word,
    )


def _build_round_summary(room: Room, session: GameSession) -> dict:
    guessed = [
        {
            "player_id": str(player.user_id),
            "player_name": _player_name(room, player.user_id),
            "points": player.round_points,
        }
        for player in sorted(
            (p for p in session.players if p.has_guessed_correctly),
            key=lambda item: (-item.round_points, item.rotation_index),
        )
    ]
    return {
        "word": session.secret_word,
        "drawer_id": str(session.drawer_user_id) if session.drawer_user_id else None,
        "guessed": guessed,
        "scores": list(_scoreboard(session)),
    }


def _end_round_active(room: Room, session: GameSession) -> tuple[list[str], dict]:
    session.phase = GAME_PHASE_ROUND_END
    session.deadline_at = _phase_deadline(ROUND_END_SECONDS)
    summary = _build_round_summary(room, session)
    return ["ROUND_ENDED", "GAME_STATE_UPDATED", "SCORES_UPDATED"], summary


def _eligible_guessers(session: GameSession) -> list[GameSessionPlayer]:
    return [
        player
        for player in _active_players(session)
        if player.user_id != session.drawer_user_id
    ]


def _all_eligible_guessed(session: GameSession) -> bool:
    eligible = _eligible_guessers(session)
    if not eligible:
        return False
    return all(player.has_guessed_correctly for player in eligible)


def select_word(
    db: Session, room_code: str, user_id: UUID, *, word: str
) -> GameMutation:
    room = _room_for_update(db, room_code)
    _member(room, user_id)
    session = room.game_session
    if session is None or session.phase != GAME_PHASE_WORD_SELECTION:
        raise GameError("UNKNOWN", "Word selection is not active.")
    if session.drawer_user_id != user_id:
        raise GameError("NOT_DRAWER", "Only the drawer can select a word.", status_code=403)
    if is_waiting_player(room, user_id):
        raise GameError("WAITING", "Waiting players cannot select a word.")

    choices = _parse_word_choices(session)
    normalized = normalize_guess(word)
    match = next((choice for choice in choices if normalize_guess(choice) == normalized), None)
    if match is None:
        raise GameError("UNKNOWN", "That word is not one of the offered choices.")

    private = _begin_round_active(session, match)
    session.revision += 1
    db.commit()
    return GameMutation(
        room.code,
        ("WORD_SELECTED", "ROUND_STARTED", "CANVAS_CLEAR", "GAME_STATE_UPDATED"),
        session.phase,
        session.revision,
        session_id=session.id,
        private_drawer=private,
        scores=_scoreboard(session),
        event_extras={
            "WORD_SELECTED": {"word_length": len(match.replace(" ", ""))},
            "ROUND_STARTED": {"word_hint": word_hint_mask(match)},
        },
    )


def submit_chat(
    db: Session, room_code: str, user_id: UUID, *, text: str
) -> GameMutation:
    room = _room_for_update(db, room_code)
    membership = _member(room, user_id)
    session = room.game_session
    if session is None:
        raise GameError("UNKNOWN", "No active game session.")

    cleaned = text.strip()
    if not cleaned:
        raise GameError("UNKNOWN", "Message cannot be empty.", status_code=422)
    if len(cleaned) > MAX_CHAT_LENGTH:
        raise GameError(
            "UNKNOWN",
            f"Message must be at most {MAX_CHAT_LENGTH} characters.",
            status_code=422,
        )

    waiting = is_waiting_player(room, user_id)
    player_name = membership.user.name
    secret = session.secret_word
    is_round = session.phase == GAME_PHASE_ROUND_ACTIVE and secret is not None
    matches_secret = is_round and words_match(secret, cleaned)

    # Never leak the secret word into public chat.
    if matches_secret:
        if waiting:
            raise GameError("WAITING", "Waiting players cannot guess.")
        if session.drawer_user_id == user_id:
            raise GameError("NOT_ALLOWED", "The drawer cannot guess.")
        frozen = next(
            (player for player in session.players if player.user_id == user_id),
            None,
        )
        if frozen is None or not frozen.is_active:
            raise GameError("WAITING", "Only active players can guess.")
        if frozen.has_guessed_correctly:
            # Already guessed — swallow the word leak, no chat echo.
            raise GameError("ALREADY_GUESSED", "You already guessed correctly.")

        now = utcnow()
        if session.deadline_at is not None:
            remaining = max(0.0, (_aware(session.deadline_at) - now).total_seconds())
        else:
            remaining = float(session.round_duration_seconds)
        g_pts = guesser_points(
            remaining_seconds=remaining,
            duration_seconds=session.round_duration_seconds,
        )
        d_pts = drawer_points_for_guess(
            remaining_seconds=remaining,
            duration_seconds=session.round_duration_seconds,
        )
        frozen.has_guessed_correctly = True
        frozen.round_points += g_pts
        frozen.score += g_pts
        drawer = next(
            (
                player
                for player in session.players
                if player.user_id == session.drawer_user_id
            ),
            None,
        )
        if drawer is not None:
            drawer.round_points += d_pts
            drawer.score += d_pts

        session.revision += 1
        events = [
            "CHAT_MESSAGE",
            "PLAYER_GUESSED",
            "SCORES_UPDATED",
            "GAME_STATE_UPDATED",
        ]
        chat = ChatEvent(
            kind="correct_guess",
            message=f"{player_name} guessed correctly!",
            player_id=str(user_id),
            player_name=player_name,
        )
        summary = None
        stop_timer = False
        if _all_eligible_guessed(session):
            end_events, summary = _end_round_active(room, session)
            events = end_events + ["CHAT_MESSAGE", "PLAYER_GUESSED", "SCORES_UPDATED"]
            # Keep CHAT / PLAYER_GUESSED before ROUND_ENDED for client UX.
            events = [
                "CHAT_MESSAGE",
                "PLAYER_GUESSED",
                "SCORES_UPDATED",
                "ROUND_ENDED",
                "GAME_STATE_UPDATED",
            ]

        db.commit()
        return GameMutation(
            room.code,
            tuple(dict.fromkeys(events)),
            session.phase,
            session.revision,
            session_id=session.id,
            stop_timer=stop_timer,
            chat_events=(chat,),
            round_summary=summary,
            scores=_scoreboard(session),
            event_extras={
                "PLAYER_GUESSED": {
                    "player_id": str(user_id),
                    "player_name": player_name,
                    "points": g_pts,
                },
                "ROUND_ENDED": summary or {},
                "SCORES_UPDATED": {"scores": list(_scoreboard(session))},
            },
        )

    # Normal chat (including during lobby / non-guess phases).
    session.revision += 1
    db.commit()
    chat = ChatEvent(
        kind="chat",
        message=cleaned,
        player_id=str(user_id),
        player_name=player_name,
    )
    return GameMutation(
        room.code,
        ("CHAT_MESSAGE",),
        session.phase,
        session.revision,
        session_id=session.id,
        chat_events=(chat,),
    )


def advance_due_session(db: Session, session_id: UUID) -> GameMutation | None:
    session = (
        db.query(GameSession)
        .filter(GameSession.id == session_id)
        .with_for_update()
        .first()
    )
    if session is None or session.phase == GAME_PHASE_LOBBY or session.deadline_at is None:
        return None

    now = utcnow()
    if _aware(session.deadline_at) > now:
        return None

    events: list[str] = []
    stop_timer = False
    private: PrivateDrawerPayload | None = None
    summary: dict | None = None
    winner_id: UUID | None = None
    event_extras: dict[str, dict] = {}
    # One phase step per call. New deadlines use wall clock so a late tick does
    # not shorten the next countdown/round (e.g. 15s showing as 12).
    session.revision += 1
    if session.phase == GAME_PHASE_COUNTDOWN:
        room = session.room
        if _admit_waiting_players(db, room, session):
            events.append("GAME_STATE_UPDATED")
        if len(_active_players(session)) < 2:
            _return_to_lobby(room, session)
            events.append("GAME_STATE_UPDATED")
            stop_timer = True
        else:
            # Keep the drawer chosen at start_game; late joiners append after.
            private = _begin_word_selection(session)
            events.extend(
                ("WORD_CHOICES_OFFERED", "GAME_STATE_UPDATED", "CANVAS_CLEAR")
            )
    elif session.phase == GAME_PHASE_WORD_SELECTION:
        choices = _parse_word_choices(session)
        if not choices:
            choices = pick_word_choices(3)
        word = secrets.choice(choices)
        private = _begin_round_active(session, word)
        events.extend(
            ("WORD_SELECTED", "ROUND_STARTED", "CANVAS_CLEAR", "GAME_STATE_UPDATED")
        )
        event_extras["WORD_SELECTED"] = {"word_length": len(word.replace(" ", ""))}
        event_extras["ROUND_STARTED"] = {"word_hint": word_hint_mask(word)}
    elif session.phase == GAME_PHASE_ROUND_ACTIVE:
        end_events, summary = _end_round_active(session.room, session)
        events.extend(end_events)
        event_extras["ROUND_ENDED"] = summary
        event_extras["SCORES_UPDATED"] = {"scores": list(_scoreboard(session))}
    elif session.phase == GAME_PHASE_ROUND_END:
        room = session.room
        next_turn = session.current_turn + 1
        old_size = _roster_size(session)
        # Full-round boundary: admit waiters, then rebase turn index to the new roster.
        if old_size > 0 and next_turn % old_size == 0:
            rounds_done = next_turn // old_size
            if _admit_waiting_players(db, room, session):
                new_size = _roster_size(session)
                session.current_turn = rounds_done * new_size - 1
                next_turn = session.current_turn + 1
                events.append("GAME_STATE_UPDATED")

        next_player = _player_for_turn(session, next_turn)
        if next_player is None or len(_active_players(session)) < 2:
            session.phase = GAME_PHASE_GAME_FINISHED
            session.deadline_at = _phase_deadline(GAME_FINISHED_SECONDS)
            session.drawer_user_id = None
            _clear_round_word_state(session)
            winner_id = _pick_winner(session)
            session.winner_user_id = winner_id
            events.extend(("GAME_FINISHED", "SCORES_UPDATED", "GAME_STATE_UPDATED"))
            event_extras["GAME_FINISHED"] = {
                "winner_user_id": str(winner_id) if winner_id else None,
                "scores": list(_scoreboard(session)),
            }
            event_extras["SCORES_UPDATED"] = {"scores": list(_scoreboard(session))}
        else:
            session.current_turn, player = next_player
            session.drawer_user_id = player.user_id
            private = _begin_word_selection(session)
            events.extend(
                ("WORD_CHOICES_OFFERED", "CANVAS_CLEAR", "GAME_STATE_UPDATED")
            )
    elif session.phase == GAME_PHASE_GAME_FINISHED:
        _return_to_lobby(session.room, session)
        events.append("GAME_STATE_UPDATED")
        stop_timer = True
    else:
        return None

    db.commit()
    return GameMutation(
        session.room.code,
        tuple(dict.fromkeys(events)),
        session.phase,
        session.revision,
        session_id=session.id,
        stop_timer=stop_timer,
        private_drawer=private,
        round_summary=summary,
        scores=_scoreboard(session),
        winner_user_id=winner_id,
        event_extras=event_extras,
    )


def handle_player_departure(
    db: Session, room: Room, user_id: UUID
) -> GameMutation | None:
    session = room.game_session
    if session is None or session.phase == GAME_PHASE_LOBBY:
        return None
    frozen = next(
        (player for player in session.players if player.user_id == user_id), None
    )
    if frozen is None or not frozen.is_active:
        # Midgame waiting player left — bump revision so clients refresh.
        session.revision += 1
        db.flush()
        return GameMutation(
            room.code,
            ("GAME_STATE_UPDATED",),
            session.phase,
            session.revision,
            session_id=session.id,
        )

    frozen.is_active = False
    session.revision += 1
    events = ["GAME_STATE_UPDATED"]
    stop_timer = False
    private: PrivateDrawerPayload | None = None
    summary: dict | None = None
    event_extras: dict[str, dict] = {}
    active = _active_players(session)
    if len(active) < 2:
        _return_to_lobby(room, session)
        stop_timer = True
    elif session.drawer_user_id == user_id:
        # Drawer left: skip the rest of their turn. Do not bump current_turn here —
        # advance_due_session / _player_for_turn skip inactive seats on the next step.
        if session.phase == GAME_PHASE_COUNTDOWN:
            replacement = _player_for_turn(session, session.current_turn)
            if replacement is not None:
                session.current_turn, player = replacement
                session.drawer_user_id = player.user_id
            else:
                _return_to_lobby(room, session)
                stop_timer = True
        elif session.phase in (GAME_PHASE_WORD_SELECTION, GAME_PHASE_ROUND_ACTIVE):
            # Keep secret_word for ROUND_ENDED reveal when drawing had started.
            session.word_choices_json = None
            session.phase = GAME_PHASE_ROUND_END
            session.deadline_at = utcnow() + timedelta(seconds=ROUND_END_SECONDS)
            summary = _build_round_summary(room, session)
            events.insert(0, "ROUND_ENDED")
            event_extras["ROUND_ENDED"] = summary
        # ROUND_END: keep phase/deadline; next tick picks the next active drawer.
    elif (
        session.phase == GAME_PHASE_ROUND_ACTIVE
        and _all_eligible_guessed(session)
        and len(_eligible_guessers(session)) > 0
    ):
        # Last remaining guesser already correct — end early after departure.
        end_events, summary = _end_round_active(room, session)
        events = end_events
        event_extras["ROUND_ENDED"] = summary

    db.flush()
    return GameMutation(
        room.code,
        tuple(dict.fromkeys(events)),
        session.phase,
        session.revision,
        session_id=session.id,
        stop_timer=stop_timer,
        private_drawer=private,
        round_summary=summary,
        scores=_scoreboard(session),
        event_extras=event_extras,
    )


def active_sessions(db: Session) -> list[tuple[UUID, str]]:
    rows = (
        db.query(GameSession.id, Room.code)
        .join(Room, Room.id == GameSession.room_id)
        .filter(GameSession.phase.in_(ACTIVE_PHASES))
        .all()
    )
    return [(session_id, code) for session_id, code in rows]


def is_waiting_player(room: Room, user_id: UUID) -> bool:
    session = room.game_session
    if session is None or session.phase == GAME_PHASE_LOBBY:
        return False
    active_ids = {player.user_id for player in session.players if player.is_active}
    return user_id not in active_ids


def public_word_hint(session: GameSession | None) -> str | None:
    if session is None or not session.secret_word:
        return None
    if session.phase in (
        GAME_PHASE_ROUND_ACTIVE,
        GAME_PHASE_ROUND_END,
        GAME_PHASE_GAME_FINISHED,
    ):
        if session.phase == GAME_PHASE_ROUND_END:
            # Round summary reveals the word separately; hint still useful mid-summary.
            return word_hint_mask(session.secret_word)
        if session.phase == GAME_PHASE_ROUND_ACTIVE:
            return word_hint_mask(session.secret_word)
    return None
