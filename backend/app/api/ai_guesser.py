"""REST API for the experimental /ai-guesser demo mode.

Public (unauthenticated) so the demo works for anonymous visitors. Quotas are
enforced server-side so the Gemini free-tier key cannot be farmed.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from app.config import settings

from app.schemas.ai_guesser import (
    AiGuesserConfigResponse,
    AiGuessRequest,
    AiGuessResponse,
    AiSpeakRequest,
)
from app.services.ai_guesser import AiGuesserError, generate_guess, is_enabled
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
        model=settings.gemini_ai_guesser_model,
        min_call_interval_ms=MIN_CALL_INTERVAL_MS,
        tts_enabled=is_enabled(),
    )


@router.post("/guess", response_model=AiGuessResponse)
async def post_ai_guess(request: Request, body: AiGuessRequest) -> AiGuessResponse:
    ip = _client_key(request)
    reason = _admit(ip)
    if reason is not None:
        _maybe_alert(reason, ip)
        raise HTTPException(
            status_code=429,
            detail="Too many AI requests. Please slow down.",
        )

    try:
        return await generate_guess(body)
    except AiGuesserError as exc:
        if exc.code == "upstream_rate_limited":
            _maybe_alert("gemini_upstream", ip)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


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
