"""Tests for Gemini TTS used by /ai-guesser/speak.

No network: httpx is replaced. The fake API key must never appear in responses.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os

os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session")
os.environ.setdefault("JWT_SECRET", "test-jwt")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import ai_guesser as ai_guesser_api
from app.config import settings
from app.services import ai_tts as ai_tts_service
from app.services.ai_guesser import AiGuesserError
from app.services.ai_tts import pcm_to_wav, synthesize_speech
from app.services.rate_limit import SlidingWindowLimiter

API_KEY = "super-secret-key-do-not-leak"
PCM = b"\x00\x01" * 64
PCM_B64 = base64.b64encode(PCM).decode()


class FakeResponse:
    def __init__(self, status_code: int, payload=None) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self):
        if self._payload is None:
            raise ValueError("not json")
        return self._payload


class FakeStream:
    def __init__(self, handler) -> None:
        self._handler = handler
        self.status_code = 200
        self._response: FakeResponse | None = None

    async def __aenter__(self) -> "FakeStream":
        result = self._handler()
        if isinstance(result, Exception):
            raise result
        self._response = result
        self.status_code = result.status_code
        return self

    async def __aexit__(self, *_exc) -> bool:
        return False

    async def aiter_lines(self):
        if self._response is None or self.status_code >= 400:
            return
            yield  # keep this a generator
        yield "data: " + json.dumps(self._response._payload)


class FakeClient:
    def __init__(self, handler, sink: dict) -> None:
        self._handler = handler
        self._sink = sink

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_exc) -> bool:
        return False

    async def post(self, url, json=None, headers=None):
        self._record(url, json, headers)
        return self._handler()

    def stream(self, method, url, json=None, headers=None):
        self._record(url, json, headers)
        return FakeStream(self._handler)

    def _record(self, url, json, headers) -> None:
        self._sink["url"] = url
        self._sink["body"] = json
        self._sink["headers"] = headers or {}


def install_client(monkeypatch, handler) -> dict:
    sink: dict = {}
    monkeypatch.setattr(
        ai_tts_service.httpx,
        "AsyncClient",
        lambda **_kwargs: FakeClient(handler, sink),
    )
    return sink


def tts_ok(pcm_b64: str = PCM_B64) -> FakeResponse:
    return FakeResponse(
        200,
        {
            "candidates": [
                {
                    "content": {
                        "parts": [{"inlineData": {"mimeType": "audio/L16", "data": pcm_b64}}]
                    }
                }
            ]
        },
    )


@pytest.fixture()
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", API_KEY)
    monkeypatch.setattr(settings, "gemini_tts_model", "gemini-tts-test")
    monkeypatch.setattr(settings, "gemini_tts_voice", "Puck")
    ai_tts_service._cache.clear()
    return settings


def run(coro):
    return asyncio.run(coro)


def test_pcm_to_wav_wraps_raw_pcm():
    wav = pcm_to_wav(PCM)
    assert wav[:4] == b"RIFF"
    assert wav[8:12] == b"WAVE"
    assert wav.endswith(PCM)


def test_pcm_to_wav_leaves_existing_wav_alone():
    already = pcm_to_wav(PCM)
    assert pcm_to_wav(already) == already


def test_synthesize_returns_wav_and_hides_key(monkeypatch, enabled):
    sink = install_client(monkeypatch, lambda: tts_ok())
    wav = run(synthesize_speech("I think it's a dog."))

    assert wav[:4] == b"RIFF"
    assert API_KEY == sink["headers"]["x-goog-api-key"]
    assert API_KEY not in sink["url"]
    assert API_KEY not in str(sink["body"])
    assert "gemini-tts-test" in sink["url"]
    assert "streamGenerateContent" in sink["url"]
    assert sink["body"]["generationConfig"]["responseModalities"] == ["AUDIO"]
    assert (
        sink["body"]["generationConfig"]["speechConfig"]["voiceConfig"][
            "prebuiltVoiceConfig"
        ]["voiceName"]
        == "Puck"
    )


def test_synthesize_reuses_cache(monkeypatch, enabled):
    calls = {"n": 0}

    def handler():
        calls["n"] += 1
        return tts_ok()

    install_client(monkeypatch, handler)
    first = run(synthesize_speech("Wait, a tail?"))
    second = run(synthesize_speech("Wait, a tail?"))
    assert first == second
    assert calls["n"] == 1


def test_empty_text_is_rejected(monkeypatch, enabled):
    install_client(monkeypatch, lambda: tts_ok())
    with pytest.raises(AiGuesserError) as exc:
        run(synthesize_speech("   "))
    assert exc.value.status_code == 422


def test_timeout_maps_to_504(monkeypatch, enabled):
    def boom():
        raise httpx.TimeoutException("slow")

    install_client(monkeypatch, boom)
    with pytest.raises(AiGuesserError) as exc:
        run(synthesize_speech("dog"))
    assert exc.value.code == "timeout"
    assert exc.value.status_code == 504


def test_upstream_429(monkeypatch, enabled):
    install_client(monkeypatch, lambda: FakeResponse(429, {}))
    with pytest.raises(AiGuesserError) as exc:
        run(synthesize_speech("dog"))
    assert exc.value.status_code == 429
    assert API_KEY not in exc.value.message


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(ai_guesser_api.router)
    return TestClient(app)


def test_config_reports_tts_without_leaking_key(client, monkeypatch, enabled):
    payload = client.get("/ai-guesser/config").json()
    assert payload["tts_enabled"] is True
    assert API_KEY not in str(payload)


def test_speak_endpoint_returns_wav(client, monkeypatch, enabled):
    install_client(monkeypatch, lambda: tts_ok())
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_limiter",
        SlidingWindowLimiter(limit=10, window_seconds=60),
    )
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_daily_ip",
        SlidingWindowLimiter(limit=10, window_seconds=60),
    )

    response = client.post("/ai-guesser/speak", json={"text": "I think it's a dog."})
    assert response.status_code == 200
    assert response.headers["x-svigl-audio"].startswith("pcm")
    assert response.content == PCM
    assert API_KEY not in response.text


def test_speak_endpoint_rejects_empty(client, monkeypatch, enabled):
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_limiter",
        SlidingWindowLimiter(limit=10, window_seconds=60),
    )
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_daily_ip",
        SlidingWindowLimiter(limit=10, window_seconds=60),
    )
    response = client.post("/ai-guesser/speak", json={"text": "   "})
    assert response.status_code == 422
    assert API_KEY not in response.text


def test_speak_endpoint_rate_limits(client, monkeypatch, enabled):
    install_client(monkeypatch, lambda: tts_ok())
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_limiter",
        SlidingWindowLimiter(limit=1, window_seconds=60),
    )
    monkeypatch.setattr(
        ai_guesser_api,
        "_tts_daily_ip",
        SlidingWindowLimiter(limit=10, window_seconds=60),
    )

    assert client.post("/ai-guesser/speak", json={"text": "one"}).status_code == 200
    throttled = client.post("/ai-guesser/speak", json={"text": "two"})
    assert throttled.status_code == 429
