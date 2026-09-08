"""Auth-scoped weekly match: runs, server clock, personal bests."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ai_guesser import AiGuesserRun, AiGuesserScore
from app.services.ai_guesser_week import (
    GAMES_PER_WEEK,
    MAX_CALLS_PER_PROMPT,
    PROMPT_LIMIT_MS,
    PROMPTS_PER_GAME,
    WEEKLY_GAMES,
    WeekGame,
    answers_match,
    current_week_id,
    pick_free_play_word,
    prompts_for_game,
    require_game,
    utcnow,
    week_pack,
    week_resets_at,
)


class MatchError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


@dataclass
class MatchSnapshot:
    run_id: UUID
    week_id: str
    game_index: int
    game_slug: str
    prompt_index: int
    secret: str
    deadline_at: datetime | None
    calls_used: int
    calls_left: int
    splits: list[dict[str, Any]]
    status: str
    prompt_solved: bool = False
    prompt_failed: bool = False
    last_split: dict[str, Any] | None = None
    total_ms: int | None = None
    is_personal_best: bool | None = None
    rank: int | None = None


@dataclass
class WeekGameCard:
    index: int
    slug: str
    title: str
    description: str
    my_best_ms: int | None
    my_rank: int | None
    finished: bool


@dataclass
class WeekOverview:
    week_id: str
    resets_at: datetime
    games: list[WeekGameCard]
    free_play_unlocked: bool
    finished_count: int


@dataclass
class RankedScore:
    rank: int
    score: AiGuesserScore


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        from datetime import timezone

        return value.replace(tzinfo=timezone.utc)
    return value


def _deadline(started_at: datetime) -> datetime:
    return _aware(started_at) + timedelta(milliseconds=PROMPT_LIMIT_MS)


def _secret_for(run: AiGuesserRun) -> str:
    if run.status != "open" or run.prompt_index >= PROMPTS_PER_GAME:
        return ""
    prompts = prompts_for_game(run.week_id, require_game(index=run.game_index))
    return prompts[run.prompt_index]


def _snapshot(
    run: AiGuesserRun,
    *,
    prompt_solved: bool = False,
    prompt_failed: bool = False,
    last_split: dict[str, Any] | None = None,
    is_personal_best: bool | None = None,
    rank: int | None = None,
) -> MatchSnapshot:
    game = require_game(index=run.game_index)
    splits = list(run.splits or [])
    open_run = run.status == "open"
    return MatchSnapshot(
        run_id=run.id,
        week_id=run.week_id,
        game_index=run.game_index,
        game_slug=game.slug,
        prompt_index=run.prompt_index,
        secret=_secret_for(run) if open_run else "",
        deadline_at=_deadline(run.prompt_started_at) if open_run else None,
        calls_used=run.calls_used if open_run else 0,
        calls_left=max(0, MAX_CALLS_PER_PROMPT - run.calls_used) if open_run else 0,
        splits=splits,
        status=run.status,
        prompt_solved=prompt_solved,
        prompt_failed=prompt_failed,
        last_split=last_split,
        total_ms=sum(int(item["ms"]) for item in splits) if splits else None,
        is_personal_best=is_personal_best,
        rank=rank,
    )


def _get_user_best(
    db: Session, *, week_id: str, game_index: int, user_id: UUID
) -> tuple[AiGuesserScore | None, int | None]:
    mine = db.scalars(
        select(AiGuesserScore).where(
            AiGuesserScore.week_id == week_id,
            AiGuesserScore.game_index == game_index,
            AiGuesserScore.user_id == user_id,
        )
    ).first()
    if mine is None:
        return None, None
    better = db.scalar(
        select(func.count())
        .select_from(AiGuesserScore)
        .where(
            AiGuesserScore.week_id == week_id,
            AiGuesserScore.game_index == game_index,
            AiGuesserScore.id != mine.id,
            (AiGuesserScore.total_ms < mine.total_ms)
            | (
                (AiGuesserScore.total_ms == mine.total_ms)
                & (AiGuesserScore.updated_at < mine.updated_at)
            ),
        )
    ) or 0
    return mine, int(better) + 1


def _upsert_score(db: Session, run: AiGuesserRun) -> tuple[bool, int | None]:
    splits = list(run.splits or [])
    total_ms = sum(int(item["ms"]) for item in splits)
    existing = db.scalars(
        select(AiGuesserScore).where(
            AiGuesserScore.week_id == run.week_id,
            AiGuesserScore.game_index == run.game_index,
            AiGuesserScore.user_id == run.user_id,
        )
    ).first()

    if existing is None:
        db.add(
            AiGuesserScore(
                user_id=run.user_id,
                week_id=run.week_id,
                game_index=run.game_index,
                total_ms=total_ms,
                splits=splits,
            )
        )
        db.flush()
        _, rank = _get_user_best(
            db, week_id=run.week_id, game_index=run.game_index, user_id=run.user_id
        )
        return True, rank

    if total_ms >= existing.total_ms:
        _, rank = _get_user_best(
            db, week_id=run.week_id, game_index=run.game_index, user_id=run.user_id
        )
        return False, rank

    existing.total_ms = total_ms
    existing.splits = splits
    db.flush()
    _, rank = _get_user_best(
        db, week_id=run.week_id, game_index=run.game_index, user_id=run.user_id
    )
    return True, rank


def _finish_prompt(
    db: Session,
    run: AiGuesserRun,
    *,
    solved: bool,
    now: datetime,
    elapsed_ms: int | None = None,
) -> dict[str, Any]:
    ms = (
        min(max(0, elapsed_ms), PROMPT_LIMIT_MS)
        if solved and elapsed_ms is not None
        else PROMPT_LIMIT_MS
    )
    split = {"ms": int(ms), "solved": bool(solved)}
    splits = list(run.splits or [])
    splits.append(split)
    run.splits = splits
    if len(splits) >= PROMPTS_PER_GAME:
        run.status = "finished"
        run.prompt_index = PROMPTS_PER_GAME
        run.calls_used = 0
        is_best, rank = _upsert_score(db, run)
        run._result = (is_best, rank)  # type: ignore[attr-defined]
    else:
        run.prompt_index += 1
        run.prompt_started_at = now
        run.calls_used = 0
        run._result = (None, None)  # type: ignore[attr-defined]
    return split


def _load_run(db: Session, user_id: UUID, run_id: UUID) -> AiGuesserRun:
    run = db.get(AiGuesserRun, run_id)
    if run is None or run.user_id != user_id:
        raise MatchError("not_found", "Run not found.", status_code=404)
    if run.week_id != current_week_id() and run.status == "open":
        run.status = "abandoned"
        db.commit()
        raise MatchError("week_over", "That week has ended.", status_code=409)
    return run


def _load_open_run(db: Session, user_id: UUID, run_id: UUID) -> AiGuesserRun:
    run = _load_run(db, user_id, run_id)
    if run.status != "open":
        raise MatchError("run_closed", "This run is already finished.", status_code=409)
    return run


def start_run(db: Session, *, user_id: UUID, game: WeekGame) -> MatchSnapshot:
    now = utcnow()
    week_id = current_week_id(now)
    open_runs = db.scalars(
        select(AiGuesserRun).where(
            AiGuesserRun.user_id == user_id,
            AiGuesserRun.status == "open",
        )
    ).all()
    for existing in open_runs:
        existing.status = "abandoned"

    run = AiGuesserRun(
        user_id=user_id,
        week_id=week_id,
        game_index=game.index,
        prompt_index=0,
        prompt_started_at=now,
        calls_used=0,
        splits=[],
        status="open",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _snapshot(run)


def get_active_run(
    db: Session, *, user_id: UUID, game: WeekGame | None = None
) -> MatchSnapshot | None:
    week_id = current_week_id()
    query = select(AiGuesserRun).where(
        AiGuesserRun.user_id == user_id,
        AiGuesserRun.status == "open",
        AiGuesserRun.week_id == week_id,
    )
    if game is not None:
        query = query.where(AiGuesserRun.game_index == game.index)
    run = db.scalars(query.order_by(AiGuesserRun.created_at.desc())).first()
    if run is None:
        return None
    return _snapshot(run)


def fail_prompt(db: Session, *, user_id: UUID, run_id: UUID) -> MatchSnapshot:
    run = _load_open_run(db, user_id, run_id)
    now = utcnow()
    expired = now >= _deadline(run.prompt_started_at)
    out_of_calls = run.calls_used >= MAX_CALLS_PER_PROMPT
    if not expired and not out_of_calls:
        raise MatchError("too_early", "This prompt is still in play.")
    split = _finish_prompt(db, run, solved=False, now=now)
    is_best, rank = getattr(run, "_result", (None, None))
    db.commit()
    db.refresh(run)
    return _snapshot(
        run,
        prompt_failed=True,
        last_split=split,
        is_personal_best=is_best,
        rank=rank,
    )


def apply_guesses(
    db: Session,
    *,
    user_id: UUID,
    run_id: UUID,
    guesses: list[Any],
    prompt_index: int | None = None,
) -> MatchSnapshot:
    run = _load_run(db, user_id, run_id)
    # Late responses after the run finished — return the final board, no error.
    if run.status != "open":
        return _snapshot(run)

    # Stale look from a previous drawing after the prompt already advanced.
    if prompt_index is not None and prompt_index != run.prompt_index:
        return _snapshot(run)

    now = utcnow()
    if now >= _deadline(run.prompt_started_at) or run.calls_used >= MAX_CALLS_PER_PROMPT:
        split = _finish_prompt(db, run, solved=False, now=now)
        is_best, rank = getattr(run, "_result", (None, None))
        db.commit()
        db.refresh(run)
        return _snapshot(
            run,
            prompt_failed=True,
            last_split=split,
            is_personal_best=is_best,
            rank=rank,
        )

    run.calls_used += 1
    secret = _secret_for(run)
    hit = any(answers_match(getattr(item, "answer", ""), secret) for item in guesses)
    if hit:
        elapsed = int((now - _aware(run.prompt_started_at)).total_seconds() * 1000)
        split = _finish_prompt(db, run, solved=True, now=now, elapsed_ms=elapsed)
        is_best, rank = getattr(run, "_result", (None, None))
        db.commit()
        db.refresh(run)
        return _snapshot(
            run,
            prompt_solved=True,
            last_split=split,
            is_personal_best=is_best,
            rank=rank,
        )

    if run.calls_used >= MAX_CALLS_PER_PROMPT:
        split = _finish_prompt(db, run, solved=False, now=now)
        is_best, rank = getattr(run, "_result", (None, None))
        db.commit()
        db.refresh(run)
        return _snapshot(
            run,
            prompt_failed=True,
            last_split=split,
            is_personal_best=is_best,
            rank=rank,
        )

    db.commit()
    db.refresh(run)
    return _snapshot(run)


def free_play_unlocked(db: Session, *, user_id: UUID, week_id: str | None = None) -> bool:
    week = week_id or current_week_id()
    count = db.scalar(
        select(func.count())
        .select_from(AiGuesserScore)
        .where(
            AiGuesserScore.user_id == user_id,
            AiGuesserScore.week_id == week,
        )
    ) or 0
    return int(count) >= GAMES_PER_WEEK


def next_free_play_word(
    db: Session, *, user_id: UUID, exclude: str | None = None
) -> str:
    week_id = current_week_id()
    if not free_play_unlocked(db, user_id=user_id, week_id=week_id):
        raise MatchError(
            "locked",
            "Finish all five weekly games to unlock Free Play.",
            status_code=403,
        )
    return pick_free_play_word(exclude, week_id=week_id)


def week_overview(db: Session, *, user_id: UUID | None) -> WeekOverview:
    week_id = current_week_id()
    # Touch the pack so it is computed even if unused here.
    week_pack(week_id)
    cards: list[WeekGameCard] = []
    finished = 0
    for game in WEEKLY_GAMES:
        best_ms = None
        rank = None
        done = False
        if user_id is not None:
            row, rank = _get_user_best(
                db, week_id=week_id, game_index=game.index, user_id=user_id
            )
            if row is not None:
                best_ms = row.total_ms
                done = True
                finished += 1
        cards.append(
            WeekGameCard(
                index=game.index,
                slug=game.slug,
                title=game.title,
                description=game.description,
                my_best_ms=best_ms,
                my_rank=rank,
                finished=done,
            )
        )
    unlocked = finished >= GAMES_PER_WEEK
    return WeekOverview(
        week_id=week_id,
        resets_at=week_resets_at(week_id),
        games=cards,
        free_play_unlocked=unlocked,
        finished_count=finished,
    )


def list_leaderboard(
    db: Session,
    *,
    game: WeekGame,
    week_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[RankedScore], int]:
    week = week_id or current_week_id()
    total = db.scalar(
        select(func.count())
        .select_from(AiGuesserScore)
        .where(
            AiGuesserScore.week_id == week,
            AiGuesserScore.game_index == game.index,
        )
    ) or 0
    rows = db.scalars(
        select(AiGuesserScore)
        .where(
            AiGuesserScore.week_id == week,
            AiGuesserScore.game_index == game.index,
        )
        .order_by(AiGuesserScore.total_ms.asc(), AiGuesserScore.updated_at.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    ranked = [RankedScore(rank=offset + i + 1, score=row) for i, row in enumerate(rows)]
    return ranked, int(total)


def get_user_best(
    db: Session, *, game: WeekGame, user_id: UUID, week_id: str | None = None
) -> tuple[int | None, int | None, list[dict[str, Any]] | None]:
    week = week_id or current_week_id()
    row, rank = _get_user_best(
        db, week_id=week, game_index=game.index, user_id=user_id
    )
    if row is None:
        return None, None, None
    return row.total_ms, rank, list(row.splits or [])
