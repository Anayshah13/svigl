"""REST API for the weekly AI Guesser time trial."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai_guesser import (
    PUBLIC_MODEL_NAME,
    AiGuessMatchState,
    AiGuessPlayResponse,
    AiGuessRequest,
    AiGuessResponse,
    AiGuessSplit,
    AiGuesserConfigResponse,
    AiGuesserFreePlayWordResponse,
    AiGuesserLeaderboardEntry,
    AiGuesserLeaderboardResponse,
    AiGuesserStartRunRequest,
    AiGuesserWeekGame,
    AiGuesserWeekResponse,
    AiSpeakRequest,
)
from app.services.ai_guesser import AiGuesserError, generate_guess, is_enabled
from app.services.ai_guesser_match import (
    MatchError,
    MatchSnapshot,
    apply_guesses,
    fail_prompt,
    get_active_run,
    get_user_best,
    list_leaderboard,
    next_free_play_word,
    start_run,
    week_overview,
)
from app.services.ai_guesser_week import (
    MAX_CALLS_PER_PROMPT,
    PROMPT_LIMIT_MS,
    PROMPTS_PER_GAME,
    require_game,
)
from app.services.ai_tts import cached_wav, stream_pcm
from app.services.email_alert import send_limit_alert
from app.services.rate_limit import SlidingWindowLimiter

router = APIRouter(prefix="/ai-guesser", tags=["ai-guesser"])

# Mirrors the client's MIN_CALL_INTERVAL_MS so one player stays ≤15 RPM.
MIN_CALL_INTERVAL_MS = 4000

_limiter = SlidingWindowLimiter(
    limit=settings.ai_guesser_rate_limit_per_minute,
    window_seconds=60.0,
)
_daily_ip_limiter = SlidingWindowLimiter(
    limit=settings.ai_guesser_daily_limit_per_ip,
    window_seconds=86_400.0,
)
_daily_global_limiter = SlidingWindowLimiter(
    limit=settings.ai_guesser_daily_global_limit,
    window_seconds=86_400.0,
)
# At most one mail per key / 30 min, and three mails per hour overall.
_alert_per_key = SlidingWindowLimiter(limit=1, window_seconds=1_800.0)
_alert_hourly = SlidingWindowLimiter(limit=3, window_seconds=3_600.0)
_tts_limiter = SlidingWindowLimiter(
    limit=settings.ai_guesser_tts_rate_limit_per_minute,
    window_seconds=60.0,
)
_tts_daily_ip = SlidingWindowLimiter(
    limit=settings.ai_guesser_tts_daily_limit_per_ip,
    window_seconds=86_400.0,
)

_GLOBAL_KEY = "__global__"


def _client_key(request: Request) -> str:
    """Client identity for quotas.

    X-Forwarded-For is ignored unless AI_GUESSER_TRUST_FORWARDED_FOR is on,
    because a raw client can spoof it and rotate past the limiter.
    """
    if settings.ai_guesser_trust_forwarded_for:
        real_ip = (request.headers.get("x-real-ip") or "").strip()
        if real_ip:
            return real_ip[:64]
        cf_ip = (request.headers.get("cf-connecting-ip") or "").strip()
        if cf_ip:
            return cf_ip[:64]
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            hops = [part.strip() for part in forwarded.split(",") if part.strip()]
            if hops:
                return hops[-1][:64]
    return request.client.host if request.client else "unknown"


def _admit(ip: str) -> str | None:
    """Reserve a guess slot. Returns a reject reason, or None if admitted."""
    if not _daily_global_limiter.peek(_GLOBAL_KEY):
        return "global_daily"
    if not _daily_ip_limiter.peek(ip):
        return "ip_daily"
    if not _limiter.peek(ip):
        return "ip_minute"
    _daily_global_limiter.allow(_GLOBAL_KEY)
    _daily_ip_limiter.allow(ip)
    _limiter.allow(ip)
    return None


def _maybe_alert(reason: str, ip: str) -> None:
    alert_key = f"{reason}:{ip}" if reason != "global_daily" else "global_daily"
    if not _alert_hourly.peek(_GLOBAL_KEY):
        return
    if not _alert_per_key.allow(alert_key):
        return
    _alert_hourly.allow(_GLOBAL_KEY)
    send_limit_alert(reason)


@router.get("/config", response_model=AiGuesserConfigResponse)
def ai_guesser_config() -> AiGuesserConfigResponse:
    """Capability probe. Never exposes the API key itself."""
    return AiGuesserConfigResponse(
        enabled=is_enabled(),
        model=PUBLIC_MODEL_NAME,
        min_call_interval_ms=MIN_CALL_INTERVAL_MS,
        tts_enabled=is_enabled(),
    )


def _match_state(snapshot: MatchSnapshot) -> AiGuessMatchState:
    return AiGuessMatchState(
        run_id=snapshot.run_id,
        week_id=snapshot.week_id,
        game_index=snapshot.game_index,
        game_slug=snapshot.game_slug,
        prompt_index=snapshot.prompt_index,
        secret=snapshot.secret,
        deadline_at=snapshot.deadline_at,
        calls_used=snapshot.calls_used,
        calls_left=snapshot.calls_left,
        splits=[AiGuessSplit.model_validate(item) for item in snapshot.splits],
        status=snapshot.status,
        prompt_solved=snapshot.prompt_solved,
        prompt_failed=snapshot.prompt_failed,
        last_split=(
            AiGuessSplit.model_validate(snapshot.last_split)
            if snapshot.last_split
            else None
        ),
        total_ms=snapshot.total_ms,
        is_personal_best=snapshot.is_personal_best,
        rank=snapshot.rank,
    )


def _game_or_404(*, slug: str | None = None, index: int | None = None):
    try:
        return require_game(slug=slug, index=index)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown AI Guesser game.") from exc


@router.get("/week", response_model=AiGuesserWeekResponse)
def get_week(
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> AiGuesserWeekResponse:
    overview = week_overview(db, user_id=viewer.id if viewer else None)
    return AiGuesserWeekResponse(
        week_id=overview.week_id,
        resets_at=overview.resets_at,
        games=[
            AiGuesserWeekGame(
                index=card.index,
                slug=card.slug,
                title=card.title,
                description=card.description,
                my_best_ms=card.my_best_ms,
                my_rank=card.my_rank,
                finished=card.finished,
            )
            for card in overview.games
        ],
        free_play_unlocked=overview.free_play_unlocked,
        finished_count=overview.finished_count,
        prompt_limit_ms=PROMPT_LIMIT_MS,
        max_calls=MAX_CALLS_PER_PROMPT,
        prompts_per_game=PROMPTS_PER_GAME,
    )


@router.post("/runs", response_model=AiGuessMatchState)
def post_run(
    body: AiGuesserStartRunRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiGuessMatchState:
    if body.game:
        game = _game_or_404(slug=body.game)
    elif body.game_index is not None:
        game = _game_or_404(index=body.game_index)
    else:
        raise HTTPException(status_code=422, detail="Pick a weekly game.")
    try:
        return _match_state(start_run(db, user_id=user.id, game=game))
    except MatchError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/runs/active", response_model=AiGuessMatchState | None)
def get_run_active(
    game: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiGuessMatchState | None:
    selected = _game_or_404(slug=game) if game else None
    snapshot = get_active_run(db, user_id=user.id, game=selected)
    return _match_state(snapshot) if snapshot else None


@router.post("/runs/{run_id}/fail", response_model=AiGuessMatchState)
def post_run_fail(
    run_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiGuessMatchState:
    try:
        from uuid import UUID

        return _match_state(fail_prompt(db, user_id=user.id, run_id=UUID(run_id)))
    except (ValueError, MatchError) as exc:
        if isinstance(exc, ValueError):
            raise HTTPException(status_code=404, detail="Run not found.") from exc
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/games/{game}/leaderboard", response_model=AiGuesserLeaderboardResponse)
def get_game_leaderboard(
    game: str,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> AiGuesserLeaderboardResponse:
    selected = _game_or_404(slug=game)
    ranked, total = list_leaderboard(
        db, game=selected, limit=limit, offset=offset
    )
    my_best = None
    my_rank = None
    my_splits = None
    if viewer is not None:
        my_best, my_rank, my_splits = get_user_best(
            db, game=selected, user_id=viewer.id
        )
    return AiGuesserLeaderboardResponse(
        week_id=week_overview(db, user_id=None).week_id,
        game_slug=selected.slug,
        game_title=selected.title,
        entries=[
            AiGuesserLeaderboardEntry(
                rank=item.rank,
                user_id=item.score.user_id,
                player=item.score.user.name if item.score.user else "Unknown",
                total_ms=item.score.total_ms,
                splits=[AiGuessSplit.model_validate(s) for s in item.score.splits or []],
                updated_at=item.score.updated_at,
            )
            for item in ranked
        ],
        total=total,
        my_best_ms=my_best,
        my_rank=my_rank,
        my_splits=[AiGuessSplit.model_validate(s) for s in my_splits]
        if my_splits
        else None,
    )


@router.get("/free-play/word", response_model=AiGuesserFreePlayWordResponse)
def get_free_play_word(
    exclude: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiGuesserFreePlayWordResponse:
    try:
        secret = next_free_play_word(db, user_id=user.id, exclude=exclude)
    except MatchError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return AiGuesserFreePlayWordResponse(secret=secret)


@router.post("/guess")
async def post_ai_guess(
    request: Request,
    body: AiGuessRequest,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> AiGuessResponse | AiGuessPlayResponse:
    ip = _client_key(request)
    reason = _admit(ip)
    if reason is not None:
        _maybe_alert(reason, ip)
        raise HTTPException(
            status_code=429,
            detail="Too many AI requests. Please slow down.",
        )

    if body.run_id is not None and viewer is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        result = await generate_guess(body)
    except AiGuesserError as exc:
        if exc.code == "upstream_rate_limited":
            _maybe_alert("gemini_upstream", ip)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if body.run_id is None:
        return result
    assert viewer is not None
    try:
        snapshot = apply_guesses(
            db,
            user_id=viewer.id,
            run_id=body.run_id,
            guesses=result.guesses,
            prompt_index=body.prompt_index,
        )
    except MatchError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return AiGuessPlayResponse(**result.model_dump(), match=_match_state(snapshot))


def _admit_tts(ip: str) -> str | None:
    if not _tts_daily_ip.peek(ip):
        return "tts_ip_daily"
    if not _tts_limiter.peek(ip):
        return "tts_ip_minute"
    _tts_daily_ip.allow(ip)
    _tts_limiter.allow(ip)
    return None


@router.post("/speak")
async def post_ai_speak(request: Request, body: AiSpeakRequest) -> Response:
    """Speak a short guesser line. Returns WAV; the Gemini key stays here."""
    ip = _client_key(request)
    reason = _admit_tts(ip)
    if reason is not None:
        _maybe_alert(reason, ip)
        raise HTTPException(
            status_code=429,
            detail="Too many AI speech requests. Please slow down.",
        )

    hit = cached_wav(body.text)
    if hit is not None:
        return Response(
            content=hit,
            media_type="audio/wav",
            headers={"Cache-Control": "no-store"},
        )

    agen = stream_pcm(body.text).__aiter__()
    try:
        first = await anext(agen)
    except StopAsyncIteration as exc:
        raise HTTPException(
            status_code=502, detail="AI speech returned no audio."
        ) from exc
    except AiGuesserError as exc:
        if exc.code == "upstream_rate_limited":
            _maybe_alert("gemini_tts_upstream", ip)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    async def rest():
        yield first
        async for pcm in agen:
            yield pcm

    return StreamingResponse(
        rest(),
        media_type="application/octet-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Svigl-Audio": "pcm;rate=24000;channels=1",
        },
    )
