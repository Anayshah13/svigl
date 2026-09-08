"""Gemini TTS for the /ai-guesser spoken line.

The API key never leaves the server. The browser only receives WAV bytes.
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
import struct
from collections import OrderedDict
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.config import settings
from app.services.ai_guesser import AiGuesserError, is_enabled

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
PCM_RATE = 24_000
PCM_CHANNELS = 1
PCM_SAMPLE_WIDTH = 2
MAX_CACHE = 24
MAX_AUDIO_BYTES = 1_200_000


class _WavCache:
    def __init__(self, limit: int = MAX_CACHE) -> None:
        self._limit = limit
        self._items: OrderedDict[str, bytes] = OrderedDict()

    def get(self, key: str) -> bytes | None:
        wav = self._items.get(key)
        if wav is None:
            return None
        self._items.move_to_end(key)
        return wav

    def put(self, key: str, wav: bytes) -> None:
        self._items[key] = wav
        self._items.move_to_end(key)
        while len(self._items) > self._limit:
            self._items.popitem(last=False)

    def clear(self) -> None:
        self._items.clear()


_cache = _WavCache()


def cached_wav(text: str) -> bytes | None:
    cleaned = " ".join(text.split()).strip()
    if not cleaned:
        return None
    return _cache.get(cleaned.casefold())


def _tts_body(text: str) -> dict[str, Any]:
    return {
        "contents": [{"role": "user", "parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": settings.gemini_tts_voice,
                    }
                }
            },
        },
    }


def _pcm_from_payload(data: dict[str, Any]) -> bytes | None:
    try:
        return _extract_audio(data)
    except AiGuesserError:
        return None


def pcm_to_wav(
    pcm: bytes,
    *,
    rate: int = PCM_RATE,
    channels: int = PCM_CHANNELS,
    sample_width: int = PCM_SAMPLE_WIDTH,
) -> bytes:
    """Wrap raw little-endian PCM in a WAV container the browser can play."""
    if pcm[:4] == b"RIFF":
        return pcm
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        rate,
        rate * channels * sample_width,
        channels * sample_width,
        sample_width * 8,
        b"data",
        data_size,
    )
    return header + pcm


def _extract_audio(data: dict[str, Any]) -> bytes:
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise AiGuesserError("no_candidates", "TTS returned no audio.")
    first = candidates[0]
    if not isinstance(first, dict):
        raise AiGuesserError("invalid_response", "Malformed TTS candidate.")
    content = first.get("content")
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        raise AiGuesserError("invalid_response", "TTS returned no audio parts.")

    for part in parts:
        if not isinstance(part, dict):
            continue
        inline = part.get("inlineData") or part.get("inline_data")
        if not isinstance(inline, dict):
            continue
        raw = inline.get("data")
        if not isinstance(raw, str) or not raw:
            continue
        try:
            pcm = base64.b64decode(raw, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise AiGuesserError(
                "invalid_response", "TTS audio was not valid base64."
            ) from exc
        if not pcm:
            raise AiGuesserError("invalid_response", "TTS audio was empty.")
        if len(pcm) > MAX_AUDIO_BYTES:
            raise AiGuesserError(
                "invalid_response", "TTS audio exceeded the size cap."
            )
        return pcm

    raise AiGuesserError("invalid_response", "TTS returned no audio data.")


async def synthesize_speech(text: str) -> bytes:
    cleaned = " ".join(text.split()).strip()
    if not cleaned:
        raise AiGuesserError(
            "invalid_speech", "Nothing to speak.", status_code=422
        )
    if not is_enabled():
        raise AiGuesserError(
            "missing_api_key",
            "AI guesser is not configured on this server.",
            status_code=503,
        )

    cached = _cache.get(cleaned.casefold())
    if cached is not None:
        return cached

    chunks = [chunk async for chunk in stream_pcm(cleaned)]
    if not chunks:
        raise AiGuesserError("invalid_response", "TTS returned no audio data.")
    wav = pcm_to_wav(b"".join(chunks))
    _cache.put(cleaned.casefold(), wav)
    return wav


async def stream_pcm(text: str) -> AsyncIterator[bytes]:
    """Yield raw 24 kHz PCM as Gemini produces it so the client can start early."""
    cleaned = " ".join(text.split()).strip()
    if not cleaned:
        raise AiGuesserError(
            "invalid_speech", "Nothing to speak.", status_code=422
        )
    if not is_enabled():
        raise AiGuesserError(
            "missing_api_key",
            "AI guesser is not configured on this server.",
            status_code=503,
        )

    model = settings.gemini_tts_model
    url = (
        f"{GEMINI_BASE_URL}/models/{model}:streamGenerateContent"
        "?alt=sse"
    )
    assembled = bytearray()

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                settings.gemini_tts_timeout_seconds, connect=3.0
            )
        ) as client:
            async with client.stream(
                "POST",
                url,
                json=_tts_body(cleaned),
                headers={"x-goog-api-key": settings.gemini_api_key or ""},
            ) as response:
                if response.status_code == 429:
                    raise AiGuesserError(
                        "upstream_rate_limited",
                        "AI speech is rate limited. Try again shortly.",
                        status_code=429,
                    )
                if response.status_code == 404:
                    logger.warning("ai-guesser unknown tts model=%s", model)
                    raise AiGuesserError(
                        "unknown_model",
                        "AI speech is unavailable.",
                        status_code=502,
                    )
                if response.status_code >= 400:
                    logger.warning(
                        "ai-guesser tts stream status=%s model=%s",
                        response.status_code,
                        model,
                    )
                    raise AiGuesserError(
                        "upstream_error", "AI speech rejected the request."
                    )

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw or raw == "[DONE]":
                        continue
                    try:
                        payload = json.loads(raw)
                    except ValueError:
                        continue
                    if not isinstance(payload, dict):
                        continue
                    pcm = _pcm_from_payload(payload)
                    if not pcm:
                        continue
                    assembled.extend(pcm)
                    yield pcm
    except AiGuesserError:
        raise
    except httpx.TimeoutException as exc:
        raise AiGuesserError(
            "timeout", "AI speech timed out.", status_code=504
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("ai-guesser tts transport error: %s", type(exc).__name__)
        raise AiGuesserError(
            "upstream_unreachable", "Could not reach AI speech."
        ) from exc

    if assembled:
        _cache.put(cleaned.casefold(), pcm_to_wav(bytes(assembled)))
