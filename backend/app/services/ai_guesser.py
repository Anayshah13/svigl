"""Gemini-backed guesser for the experimental /ai-guesser demo mode.

Design notes:

* The API key never leaves the server; the browser only talks to FastAPI.
* Every model response is validated and normalized before it is trusted.
* Failures raise `AiGuesserError` with a stable `code` so the client can keep
  the player drawing instead of breaking.
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
import math
import time
from typing import Any

import httpx
from pydantic import ValidationError

from app.config import settings
from app.schemas.ai_guesser import (
    MAX_GUESSES,
    MAX_LINE_LENGTH,
    AiGuessItem,
    AiGuessRequest,
    AiGuessResponse,
    AiGuessUsage,
    GeminiGuessPayload,
)

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

SYSTEM_INSTRUCTION = (
    "You guess Pictionary drawings from unfinished, messy sketches. "
    "Name the common, shoutable everyday word a person would yell — "
    "not a breed, scientific name, brand SKU, or niche subtype "
    "(dog, not golden retriever). "
    "Previous guesses are context only and may be wrong. "
    "Return structured JSON only."
)

# OpenAPI-subset schema for Gemini structured output.
RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "guesses": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "answer": {"type": "STRING"},
                    "confidence": {"type": "NUMBER"},
                },
                "required": ["answer", "confidence"],
            },
        },
        "line": {"type": "STRING"},
    },
    "required": ["guesses"],
}

# Enough for 3 short guesses plus one spoken sentence.
MAX_OUTPUT_TOKENS = 224


class AiGuesserError(Exception):
    """Domain error carrying a stable code plus an HTTP status."""

    def __init__(self, code: str, message: str, *, status_code: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def is_enabled() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def _decode_image(image_base64: str) -> bytes:
    try:
        raw = base64.b64decode(image_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AiGuesserError(
            "invalid_image", "Snapshot was not valid base64.", status_code=422
        ) from exc
    if not raw:
        raise AiGuesserError(
            "invalid_image", "Snapshot was empty.", status_code=422
        )
    if len(raw) > settings.ai_guesser_max_image_bytes:
        raise AiGuesserError(
            "image_too_large",
            f"Snapshot exceeds {settings.ai_guesser_max_image_bytes} bytes.",
            status_code=413,
        )
    return raw


def _build_user_text(payload: AiGuessRequest) -> str:
    lines: list[str] = [
        "Guess freely from the sketch. Prefer the everyday word a person "
        "would shout, spelled the ordinary way — never a breed, scientific "
        "name, brand, or overly specific subtype.",
    ]

    if payload.previous_guesses:
        lines.append(
            "Your previous guesses (context only, may be wrong): "
            + ", ".join(payload.previous_guesses)
        )

    lines.append(
        f"Return at most {MAX_GUESSES} guesses, ranked most likely first, "
        "each with a confidence between 0 and 1."
    )
    lines.append(
        "Also include a short spoken line: one casual aside about a visual "
        "detail, then your top guess. No markdown, no long explanation."
    )
    return "\n".join(lines)


def _thinking_config() -> dict[str, Any] | None:
    """Prefer thinkingLevel (Gemini 3.x). Fall back to thinkingBudget (2.5)."""
    level = (settings.gemini_thinking_level or "").strip().lower()
    if level and level not in {"omit", "none", "off"}:
        return {"thinkingLevel": level}
    if settings.gemini_thinking_budget >= 0:
        return {"thinkingBudget": settings.gemini_thinking_budget}
    return None


def _build_request_body(payload: AiGuessRequest, image_base64: str) -> dict[str, Any]:
    generation_config: dict[str, Any] = {
        "responseMimeType": "application/json",
        "responseSchema": RESPONSE_SCHEMA,
        "temperature": 0.2,
        "maxOutputTokens": MAX_OUTPUT_TOKENS,
        "candidateCount": 1,
        # Line drawings do not need high-res tiles — fewer input tokens.
        "mediaResolution": "MEDIA_RESOLUTION_LOW",
    }
    thinking = _thinking_config()
    if thinking is not None:
        generation_config["thinkingConfig"] = thinking

    return {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": payload.mime_type,
                            "data": image_base64,
                        }
                    },
                    {"text": _build_user_text(payload)},
                ],
            }
        ],
        "generationConfig": generation_config,
    }


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        feedback = data.get("promptFeedback")
        reason = None
        if isinstance(feedback, dict):
            reason = feedback.get("blockReason")
        raise AiGuesserError(
            "no_candidates",
            f"Model returned no candidates ({reason or 'unknown reason'}).",
        )

    first = candidates[0]
    if not isinstance(first, dict):
        raise AiGuesserError("invalid_response", "Malformed candidate entry.")

    content = first.get("content")
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        finish = first.get("finishReason")
        raise AiGuesserError(
            "invalid_response",
            f"Model returned no content ({finish or 'unknown finish reason'}).",
        )

    text = "".join(
        part["text"]
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    ).strip()

    if not text:
        raise AiGuesserError("invalid_response", "Model returned empty text.")
    return text


def _parse_usage(data: dict[str, Any]) -> AiGuessUsage | None:
    meta = data.get("usageMetadata")
    if not isinstance(meta, dict):
        return None

    def read(key: str) -> int | None:
        value = meta.get(key)
        return value if isinstance(value, int) else None

    usage = AiGuessUsage(
        prompt_tokens=read("promptTokenCount"),
        output_tokens=read("candidatesTokenCount"),
        total_tokens=read("totalTokenCount"),
    )
    if usage.prompt_tokens is None and usage.total_tokens is None:
        return None
    return usage


def normalize_line(raw: str) -> str:
    """Collapse whitespace and cap the spoken aside. Empty is fine."""
    cleaned = " ".join(raw.split())
    if len(cleaned) > MAX_LINE_LENGTH:
        cleaned = cleaned[:MAX_LINE_LENGTH].rstrip()
    return cleaned


def normalize_guesses(payload: GeminiGuessPayload) -> list[AiGuessItem]:
    """Clamp, rescale, de-duplicate, and rank raw model guesses."""
    raw: list[tuple[str, float]] = []
    for guess in payload.guesses:
        confidence = guess.confidence
        if not math.isfinite(confidence):
            continue
        answer = " ".join(guess.answer.split())
        if not answer:
            continue
        raw.append((answer, confidence))

    if not raw:
        return []

    # Some models answer on a 0-100 scale despite the instruction.
    if max(value for _, value in raw) > 1.0:
        raw = [(answer, value / 100.0) for answer, value in raw]

    # Keep the highest confidence per answer; dict order preserves the
    # model's own ranking so ties break toward what it listed first.
    best: dict[str, tuple[str, float]] = {}
    for answer, value in raw:
        clamped = min(1.0, max(0.0, value))
        key = answer.casefold()
        existing = best.get(key)
        if existing is None or clamped > existing[1]:
            best[key] = (answer, clamped)

    ranked = sorted(best.values(), key=lambda item: item[1], reverse=True)
    return [
        AiGuessItem(answer=answer, confidence=value)
        for answer, value in ranked[:MAX_GUESSES]
    ]


async def generate_guess(payload: AiGuessRequest) -> AiGuessResponse:
    if not is_enabled():
        raise AiGuesserError(
            "missing_api_key",
            "AI guesser is not configured on this server.",
            status_code=503,
        )

    image_base64 = payload.image_base64
    _decode_image(image_base64)  # validate size/shape before paying for a call

    model = settings.gemini_ai_guesser_model
    url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
    body = _build_request_body(payload, image_base64)

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=settings.gemini_timeout_seconds
        ) as client:
            response = await client.post(
                url,
                json=body,
                # Header auth keeps the key out of URLs and access logs.
                headers={"x-goog-api-key": settings.gemini_api_key or ""},
            )
    except httpx.TimeoutException as exc:
        raise AiGuesserError(
            "timeout", "AI guesser timed out.", status_code=504
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("ai-guesser transport error: %s", type(exc).__name__)
        raise AiGuesserError(
            "upstream_unreachable", "Could not reach the AI guesser."
        ) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)

    if response.status_code == 429:
        raise AiGuesserError(
            "upstream_rate_limited",
            "AI guesser is rate limited. Try again shortly.",
            status_code=429,
        )
    if response.status_code == 404:
        logger.warning("ai-guesser unknown model=%s", model)
        raise AiGuesserError(
            "unknown_model",
            f"Gemini model '{model}' was not found. Set GEMINI_AI_GUESSER_MODEL "
            "to a current Flash-Lite id (e.g. gemini-3.5-flash-lite).",
            status_code=502,
        )
    if response.status_code >= 400:
        # Body may echo request detail; log status only, never the key.
        logger.warning(
            "ai-guesser upstream status=%s model=%s", response.status_code, model
        )
        raise AiGuesserError(
            "upstream_error", "AI guesser rejected the request."
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise AiGuesserError(
            "invalid_response", "AI guesser returned non-JSON."
        ) from exc
    if not isinstance(data, dict):
        raise AiGuesserError("invalid_response", "AI guesser returned non-JSON.")

    text = _extract_text(data)

    try:
        parsed = GeminiGuessPayload.model_validate(json.loads(text))
    except (ValueError, ValidationError) as exc:
        raise AiGuesserError(
            "invalid_response", "AI guesser returned malformed guesses."
        ) from exc

    return AiGuessResponse(
        guesses=normalize_guesses(parsed),
        line=normalize_line(parsed.line),
        model=model,
        mode=payload.mode,
        drawing_version=payload.drawing_version,
        latency_ms=latency_ms,
        usage=_parse_usage(data),
    )
