import math
from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.room import (
    GAME_PHASE_GAME_FINISHED,
    GAME_PHASE_LOBBY,
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GAME_PHASE_WORD_SELECTION,
)


class CreateRoomRequest(BaseModel):
    max_players: int = Field(default=8, ge=2, le=16)


class TargetPlayerRequest(BaseModel):
    player_id: UUID


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    avatar_url: str | None
    is_ready: bool = False
    is_waiting: bool = False
    score: int = 0


class GameSettingsResponse(BaseModel):
    total_rounds: int
    round_duration_seconds: int

    @property
    def rounds(self) -> int:
        return self.total_rounds


class ScoreEntryResponse(BaseModel):
    player_id: UUID
    score: int
    round_points: int = 0
    has_guessed_correctly: bool = False
    is_active: bool = True


class RoundGuessedEntryResponse(BaseModel):
    player_id: UUID
    player_name: str
    points: int = 0


class RoundSummaryResponse(BaseModel):
    word: str | None = None
    drawer_id: UUID | None = None
    guessed: list[RoundGuessedEntryResponse] = Field(default_factory=list)
    scores: list[ScoreEntryResponse] = Field(default_factory=list)


class GameStateResponse(BaseModel):
    session_id: UUID | None
    phase: str
    revision: int
    server_time: datetime
    deadline_at: datetime | None
    remaining_seconds: int | None
    current_round: int
    current_turn: int
    drawer_id: UUID | None
    rotation: list[UUID]
    active_player_ids: list[UUID]
    waiting_player_ids: list[UUID]
    rotation_start_offset: int
    total_rounds: int
    settings: GameSettingsResponse
    # Public word fields — never the secret unless viewer is drawer / correct guesser.
    word_hint: str | None = None
    word_length: int | None = None
    secret_word: str | None = None
    word_choices: list[str] | None = None
    scores: list[ScoreEntryResponse] = Field(default_factory=list)
    guessed_player_ids: list[UUID] = Field(default_factory=list)
    winner_id: UUID | None = None
    round_summary: RoundSummaryResponse | None = None


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    host_id: UUID
    status: str
    max_players: int
    created_at: datetime
    players: list[PlayerResponse]
    settings: GameSettingsResponse
    game: GameStateResponse
    revision: int
    can_start: bool
    ready_player_ids: list[UUID]
    waiting_player_ids: list[UUID]

    @classmethod
    def from_room(
        cls, room: object, *, viewer_id: UUID | None = None
    ) -> "RoomResponse":
        from app.models.room import Room
        from app.services.game import public_word_hint, session_round_summary
        from app.services.words import spaced_word

        assert isinstance(room, Room)
        now = datetime.now(timezone.utc)
        # Defensive defaults for legacy rooms that predate game_settings rows.
        if room.game_settings is None:
            settings = GameSettingsResponse(
                total_rounds=3,
                round_duration_seconds=60,
            )
        else:
            settings = GameSettingsResponse(
                total_rounds=room.game_settings.total_rounds,
                round_duration_seconds=room.game_settings.round_duration_seconds,
            )
        session = room.game_session
        active_ids = (
            {
                player.user_id
                for player in session.players
                if player.is_active
            }
            if session is not None
            else set()
        )
        active_rotation = (
            [
                player.user_id
                for player in sorted(session.players, key=lambda item: item.rotation_index)
                if player.is_active
            ]
            if session is not None
            else []
        )
        waiting_ids = [
            rp.user_id
            for rp in room.players
            if session is not None
            and session.phase != GAME_PHASE_LOBBY
            and rp.user_id not in active_ids
        ]
        ready_ids = [rp.user_id for rp in room.players if rp.is_ready]
        score_by_user = (
            {player.user_id: player.score for player in session.players}
            if session is not None
            else {}
        )

        if session is None:
            game = GameStateResponse(
                session_id=None,
                phase=GAME_PHASE_LOBBY,
                revision=0,
                server_time=now,
                deadline_at=None,
                remaining_seconds=None,
                current_round=0,
                current_turn=0,
                drawer_id=None,
                rotation=[],
                active_player_ids=[],
                waiting_player_ids=[],
                rotation_start_offset=0,
                total_rounds=settings.total_rounds,
                settings=settings,
            )
            revision = 0
            can_start = False
        else:
            deadline = session.deadline_at
            if deadline is not None and deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            remaining = (
                max(0, math.ceil((deadline - now).total_seconds()))
                if deadline is not None
                else None
            )
            from app.services.game import display_round_number

            current_round = display_round_number(session)
            is_drawer_viewer = (
                viewer_id is not None and viewer_id == session.drawer_user_id
            )
            viewer_guessed = False
            if viewer_id is not None:
                viewer_guessed = any(
                    player.user_id == viewer_id and player.has_guessed_correctly
                    for player in session.players
                )
            secret = session.secret_word
            word_hint = None
            word_length = None
            secret_for_viewer = None
            choices_for_viewer = None

            if secret and session.phase in (
                GAME_PHASE_ROUND_ACTIVE,
                GAME_PHASE_ROUND_END,
            ):
                word_hint = public_word_hint(session)
                word_length = len(secret.replace(" ", ""))
            if session.phase == GAME_PHASE_WORD_SELECTION and session.word_choices_json:
                # Length unknown until selected; expose choices only to the drawer.
                pass
            if is_drawer_viewer:
                if session.phase == GAME_PHASE_WORD_SELECTION and session.word_choices_json:
                    import json

                    try:
                        raw = json.loads(session.word_choices_json)
                        if isinstance(raw, list):
                            choices_for_viewer = [str(item) for item in raw]
                    except json.JSONDecodeError:
                        choices_for_viewer = None
                if secret and session.phase in (
                    GAME_PHASE_ROUND_ACTIVE,
                    GAME_PHASE_ROUND_END,
                    GAME_PHASE_WORD_SELECTION,
                ):
                    secret_for_viewer = secret
            # Correct guessers see the full word filled in during the round.
            if (
                viewer_guessed
                and secret
                and session.phase == GAME_PHASE_ROUND_ACTIVE
            ):
                secret_for_viewer = secret
                word_hint = spaced_word(secret)
            # Reveal full word to everyone only at round end / finished summary window.
            if secret and session.phase in (
                GAME_PHASE_ROUND_END,
                GAME_PHASE_GAME_FINISHED,
            ):
                secret_for_viewer = secret
                word_hint = spaced_word(secret)
                word_length = len(secret.replace(" ", ""))

            scores = [
                ScoreEntryResponse(
                    player_id=player.user_id,
                    score=player.score,
                    round_points=player.round_points,
                    has_guessed_correctly=player.has_guessed_correctly,
                    is_active=player.is_active,
                )
                for player in sorted(
                    session.players,
                    key=lambda item: (-item.score, item.rotation_index),
                )
            ]
            guessed_ids = [
                player.user_id
                for player in session.players
                if player.has_guessed_correctly
            ]

            round_summary = None
            raw_summary = session_round_summary(session)
            if raw_summary is not None:
                guessed_rows = []
                for item in raw_summary.get("guessed") or []:
                    if not isinstance(item, dict):
                        continue
                    pid = item.get("player_id")
                    if pid is None:
                        continue
                    guessed_rows.append(
                        RoundGuessedEntryResponse(
                            player_id=UUID(str(pid)),
                            player_name=str(item.get("player_name") or "Player"),
                            points=int(item.get("points") or 0),
                        )
                    )
                drawer_raw = raw_summary.get("drawer_id")
                round_summary = RoundSummaryResponse(
                    word=raw_summary.get("word"),
                    drawer_id=UUID(str(drawer_raw)) if drawer_raw else None,
                    guessed=guessed_rows,
                    scores=scores,
                )

            game = GameStateResponse(
                session_id=session.id,
                phase=session.phase,
                revision=session.revision,
                server_time=now,
                deadline_at=deadline,
                remaining_seconds=remaining,
                current_round=current_round,
                current_turn=session.current_turn,
                drawer_id=session.drawer_user_id,
                rotation=active_rotation,
                active_player_ids=active_rotation,
                waiting_player_ids=waiting_ids,
                rotation_start_offset=session.rotation_start_offset,
                total_rounds=session.total_rounds,
                settings=GameSettingsResponse(
                    total_rounds=session.total_rounds,
                    round_duration_seconds=session.round_duration_seconds,
                ),
                word_hint=word_hint,
                word_length=word_length,
                secret_word=secret_for_viewer,
                word_choices=choices_for_viewer,
                scores=scores,
                guessed_player_ids=guessed_ids,
                winner_id=session.winner_user_id,
                round_summary=round_summary,
            )
            revision = session.revision
            can_start = (
                session.phase == GAME_PHASE_LOBBY
                and len(room.players) >= 2
                and all(player.is_ready for player in room.players)
            )

        return cls(
            id=room.id,
            code=room.code,
            host_id=room.host_id,
            status=room.status,
            max_players=room.max_players,
            created_at=room.created_at,
            players=[
                PlayerResponse(
                    id=rp.user.id,
                    name=rp.user.name,
                    avatar_url=rp.user.avatar_url,
                    is_ready=rp.is_ready,
                    is_waiting=session is not None
                    and session.phase != GAME_PHASE_LOBBY
                    and rp.user_id not in active_ids,
                    score=score_by_user.get(rp.user_id, 0),
                )
                for rp in room.players
            ],
            settings=settings,
            game=game,
            revision=revision,
            can_start=can_start,
            ready_player_ids=ready_ids,
            waiting_player_ids=waiting_ids,
        )
