"""Tests for the experimental /ai-guesser mode.

Covers request validation, Gemini response normalization, failure handling,
and the HTTP error contract. No network access: `httpx.AsyncClient` is
replaced with a fake so every upstream shape can be exercised.
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
from app.schemas.ai_guesser import (
    MAX_LINE_LENGTH,
    AiGuessRequest,
    GeminiGuess,
    GeminiGuessPayload,
)
from app.services import ai_guesser as ai_guesser_service
from app.services.ai_guesser import (
    MAX_OUTPUT_TOKENS,
    AiGuesserError,
    generate_guess,
    normalize_guesses,
    normalize_line,
)
from app.services.rate_limit import SlidingWindowLimiter

API_KEY = "super-secret-key-do-not-leak"
IMAGE_B64 = base64.b64encode(b"fake-png-bytes" * 8).decode()
CANDIDATES = ["star wars", "spaceship", "dog"]


# --- Fake httpx plumbing ----------------------------------------------------


class FakeResponse:
    def __init__(self, status_code: int, payload=None, *, raw_text=None) -> None:
        self.status_code = status_code
        self._payload = payload
        self._raw_text = raw_text

    def json(self):
        if self._raw_text is not None:
            raise ValueError("not json")
        return self._payload


class FakeClient:
    """Stands in for httpx.AsyncClient; records the outbound request."""

    def __init__(self, handler, sink: dict) -> None:
        self._handler = handler
        self._sink = sink

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_exc) -> bool:
        return False

    async def post(self, url, json=None, headers=None):
        self._sink["url"] = url
        self._sink["body"] = json
        self._sink["headers"] = headers or {}
        return self._handler()


def install_client(monkeypatch, handler) -> dict:
    sink: dict = {}
    monkeypatch.setattr(
        ai_guesser_service.httpx,
        "AsyncClient",
        lambda **_kwargs: FakeClient(handler, sink),
    )
    return sink


def gemini_ok(guesses: list[dict], line: str = "") -> FakeResponse:
    payload = {"guesses": guesses}
    if line:
        payload["line"] = line
    return FakeResponse(
        200,
        {
            "candidates": [
                {"content": {"parts": [{"text": json.dumps(payload)}]}}
            ],
            "usageMetadata": {
                "promptTokenCount": 310,
                "candidatesTokenCount": 24,
                "totalTokenCount": 334,
            },
        },
    )


@pytest.fixture()
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", API_KEY)
    monkeypatch.setattr(settings, "gemini_ai_guesser_model", "gemini-test-lite")
    return settings


def request_payload(**overrides) -> AiGuessRequest:
    data = {
        "image_base64": IMAGE_B64,
        "mime_type": "image/png",
        "drawing_version": 7,
        "mode": "game",
        "candidates": list(CANDIDATES),
        "previous_guesses": ["dog"],
    }
    data.update(overrides)
    return AiGuessRequest(**data)


def run(coro):
    return asyncio.run(coro)


# --- Request schema ---------------------------------------------------------


def test_strips_data_url_prefix():
    payload = request_payload(image_base64=f"data:image/png;base64,{IMAGE_B64}")
    assert payload.image_base64 == IMAGE_B64


def test_candidates_are_trimmed_and_deduplicated():
    payload = request_payload(
        candidates=["  Dog  ", "dog", "DOG", "", "   ", "spaceship"]
    )
    assert payload.candidates == ["Dog", "spaceship"]


def test_previous_guesses_are_capped():
    payload = request_payload(previous_guesses=["a", "b", "c", "d", "e"])
    assert len(payload.previous_guesses) == 3


def test_rejects_unknown_fields():
    with pytest.raises(Exception):
        AiGuessRequest(image_base64=IMAGE_B64, sneaky="value")


# --- Missing configuration --------------------------------------------------


def test_missing_api_key_is_reported_cleanly(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", None)

    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))

    assert exc.value.code == "missing_api_key"
    assert exc.value.status_code == 503
    assert API_KEY not in exc.value.message


def test_blank_api_key_counts_as_missing(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "   ")
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "missing_api_key"


# --- Happy path -------------------------------------------------------------


def test_valid_response_is_parsed(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: gemini_ok(
            [
                {"answer": "star wars", "confidence": 0.74},
                {"answer": "spaceship", "confidence": 0.11},
            ]
        ),
    )

    result = run(generate_guess(request_payload()))

    assert [g.answer for g in result.guesses] == ["star wars", "spaceship"]
    assert result.guesses[0].confidence == pytest.approx(0.74)
    assert result.line == ""
    assert result.model == "AnAI 1.3 Pro"
    assert result.mode == "game"
    assert result.latency_ms >= 0
    assert result.usage is not None
    assert result.usage.total_tokens == 334


def test_drawing_version_is_echoed_for_stale_detection(monkeypatch, enabled):
    install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    result = run(generate_guess(request_payload(drawing_version=41)))
    assert result.drawing_version == 41


def test_image_is_sent_and_candidate_list_is_not(monkeypatch, enabled):
    sink = install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    run(generate_guess(request_payload()))

    body = sink["body"]
    parts = body["contents"][0]["parts"]
    assert parts[0]["inlineData"]["data"] == IMAGE_B64
    assert parts[0]["inlineData"]["mimeType"] == "image/png"

    prompt = parts[1]["text"]
    system = body["systemInstruction"]["parts"][0]["text"]
    # Leftover client candidates must not be injected into the prompt.
    assert "star wars" not in prompt
    assert "spaceship" not in prompt
    assert "candidate list" not in prompt.lower()
    assert "Guess freely" in prompt
    assert "dog" in prompt  # previous guess passed as context
    assert "golden retriever" in system.lower()
    assert "line" in prompt.lower()

    schema = body["generationConfig"]["responseSchema"]
    assert "line" in schema["properties"]
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert "gemini-test-lite" in sink["url"]


def test_game_mode_keeps_off_list_answers(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: gemini_ok(
            [{"answer": "anything", "confidence": 0.9}],
            line="Wait, is that a tail? I'm going with dog.",
        ),
    )
    result = run(generate_guess(request_payload(mode="game")))

    assert result.guesses[0].answer == "anything"
    assert result.line == "Wait, is that a tail? I'm going with dog."


def test_thinking_level_defaults_to_minimal(monkeypatch, enabled):
    monkeypatch.setattr(settings, "gemini_thinking_level", "minimal")
    sink = install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    run(generate_guess(request_payload()))
    config = sink["body"]["generationConfig"]
    assert config["thinkingConfig"] == {"thinkingLevel": "minimal"}
    assert config["mediaResolution"] == "MEDIA_RESOLUTION_LOW"
    assert config["maxOutputTokens"] == MAX_OUTPUT_TOKENS


def test_thinking_omitted_when_level_blank_and_budget_negative(monkeypatch, enabled):
    monkeypatch.setattr(settings, "gemini_thinking_level", "")
    monkeypatch.setattr(settings, "gemini_thinking_budget", -1)
    sink = install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    run(generate_guess(request_payload()))
    assert "thinkingConfig" not in sink["body"]["generationConfig"]


def test_thinking_budget_used_when_level_omitted(monkeypatch, enabled):
    monkeypatch.setattr(settings, "gemini_thinking_level", "omit")
    monkeypatch.setattr(settings, "gemini_thinking_budget", 0)
    sink = install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    run(generate_guess(request_payload()))
    assert sink["body"]["generationConfig"]["thinkingConfig"] == {
        "thinkingBudget": 0
    }


# --- Secret handling --------------------------------------------------------


def test_api_key_is_sent_as_header_and_never_in_url_or_body(monkeypatch, enabled):
    sink = install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    result = run(generate_guess(request_payload()))

    assert sink["headers"]["x-goog-api-key"] == API_KEY
    assert API_KEY not in sink["url"]
    assert API_KEY not in json.dumps(sink["body"])
    # And never in anything we hand back to the client.
    assert API_KEY not in result.model_dump_json()


# --- Malformed / hostile model output ---------------------------------------


def test_non_json_model_text_is_rejected(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: FakeResponse(
            200,
            {"candidates": [{"content": {"parts": [{"text": "I think it's a dog!"}]}}]},
        ),
    )
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "invalid_response"


def test_wrong_json_shape_is_rejected(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: FakeResponse(
            200,
            {
                "candidates": [
                    {"content": {"parts": [{"text": json.dumps({"guesses": "nope"})}]}}
                ]
            },
        ),
    )
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "invalid_response"


def test_non_json_http_body_is_rejected(monkeypatch, enabled):
    install_client(monkeypatch, lambda: FakeResponse(200, raw_text="<html/>"))
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "invalid_response"


def test_blocked_prompt_is_reported(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: FakeResponse(200, {"promptFeedback": {"blockReason": "SAFETY"}}),
    )
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "no_candidates"


def test_missing_content_reports_finish_reason(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: FakeResponse(200, {"candidates": [{"finishReason": "MAX_TOKENS"}]}),
    )
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "invalid_response"
    assert "MAX_TOKENS" in exc.value.message


# --- Transport failures -----------------------------------------------------


def test_timeout_is_surfaced_as_504(monkeypatch, enabled):
    def boom():
        raise httpx.TimeoutException("too slow")

    install_client(monkeypatch, boom)

    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "timeout"
    assert exc.value.status_code == 504


def test_network_failure_is_surfaced(monkeypatch, enabled):
    def boom():
        raise httpx.ConnectError("no route")

    install_client(monkeypatch, boom)

    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "upstream_unreachable"


def test_upstream_rate_limit_maps_to_429(monkeypatch, enabled):
    install_client(monkeypatch, lambda: FakeResponse(429, {}))
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "upstream_rate_limited"
    assert exc.value.status_code == 429


def test_upstream_error_does_not_leak_body(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: FakeResponse(400, {"error": {"message": f"bad key {API_KEY}"}}),
    )
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "upstream_error"
    assert API_KEY not in exc.value.message


# --- Image validation -------------------------------------------------------


def test_invalid_base64_is_rejected(monkeypatch, enabled):
    install_client(monkeypatch, lambda: gemini_ok([]))
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload(image_base64="!!!!not-base64!!!!" * 3)))
    assert exc.value.code == "invalid_image"
    assert exc.value.status_code == 422


def test_oversized_image_is_rejected(monkeypatch, enabled):
    monkeypatch.setattr(settings, "ai_guesser_max_image_bytes", 16)
    install_client(monkeypatch, lambda: gemini_ok([]))
    with pytest.raises(AiGuesserError) as exc:
        run(generate_guess(request_payload()))
    assert exc.value.code == "image_too_large"
    assert exc.value.status_code == 413


# --- Guess normalization ----------------------------------------------------


def payload_of(*pairs) -> GeminiGuessPayload:
    return GeminiGuessPayload(
        guesses=[GeminiGuess(answer=a, confidence=c) for a, c in pairs]
    )


def test_normalize_rescales_percentage_confidences():
    items = normalize_guesses(payload_of(("dog", 74.0), ("cat", 11.0)))
    assert items[0].confidence == pytest.approx(0.74)
    assert items[1].confidence == pytest.approx(0.11)


def test_normalize_clamps_out_of_range_values():
    items = normalize_guesses(payload_of(("dog", -5.0)))
    assert items[0].confidence == 0.0


def test_normalize_drops_non_finite_confidences():
    items = normalize_guesses(payload_of(("dog", float("nan")), ("cat", 0.5)))
    assert [g.answer for g in items] == ["cat"]


def test_normalize_keeps_off_list_answers():
    items = normalize_guesses(payload_of(("banana", 0.9), ("dog", 0.4)))
    assert [g.answer for g in items] == ["banana", "dog"]


def test_normalize_preserves_model_casing():
    items = normalize_guesses(payload_of(("STAR WARS", 0.8)))
    assert items[0].answer == "STAR WARS"


def test_normalize_deduplicates_and_caps_at_three():
    items = normalize_guesses(
        payload_of(
            ("dog", 0.2), ("dog", 0.6), ("cat", 0.5), ("car", 0.4), ("sun", 0.3)
        )
    )
    assert [g.answer for g in items] == ["dog", "cat", "car"]
    assert items[0].confidence == pytest.approx(0.6)


def test_normalize_handles_empty_output():
    assert normalize_guesses(payload_of()) == []


def test_normalize_line_caps_and_collapses_whitespace():
    assert normalize_line("  Wait,   a tail?  ") == "Wait, a tail?"
    assert normalize_line("") == ""
    long_line = "x" * (MAX_LINE_LENGTH + 20)
    assert normalize_line(long_line) == "x" * MAX_LINE_LENGTH


def test_spoken_line_is_returned(monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: gemini_ok(
            [{"answer": "dog", "confidence": 0.8}],
            line="Wait, is that a tail? I'm going with dog.",
        ),
    )
    result = run(generate_guess(request_payload()))
    assert result.line == "Wait, is that a tail? I'm going with dog."


def test_missing_line_is_empty_string(monkeypatch, enabled):
    install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    result = run(generate_guess(request_payload()))
    assert result.line == ""


# --- Rate limiter -----------------------------------------------------------


def test_sliding_window_allows_up_to_limit():
    limiter = SlidingWindowLimiter(limit=3, window_seconds=60)
    assert [limiter.allow("ip", now=0) for _ in range(4)] == [True, True, True, False]


def test_sliding_window_recovers_after_window():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=10)
    assert limiter.allow("ip", now=0) is True
    assert limiter.allow("ip", now=5) is False
    assert limiter.allow("ip", now=11) is True


def test_sliding_window_is_per_key():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert limiter.allow("a", now=0) is True
    assert limiter.allow("b", now=0) is True


def test_sliding_window_peek_does_not_consume():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert limiter.peek("ip", now=0) is True
    assert limiter.peek("ip", now=0) is True
    assert limiter.allow("ip", now=0) is True
    assert limiter.peek("ip", now=0) is False


# --- HTTP contract ----------------------------------------------------------


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(ai_guesser_api.router)
    return TestClient(app)


def body(**overrides) -> dict:
    data = {
        "image_base64": IMAGE_B64,
        "mime_type": "image/png",
        "drawing_version": 3,
        "mode": "game",
        "candidates": list(CANDIDATES),
        "previous_guesses": [],
    }
    data.update(overrides)
    return data


def test_config_endpoint_reports_availability_without_leaking_key(
    client, monkeypatch, enabled
):
    response = client.get("/ai-guesser/config")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["model"] == "AnAI 1.3 Pro"
    assert "gemini" not in response.text.lower()
    assert API_KEY not in response.text


def test_config_endpoint_reports_disabled(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", None)
    payload = client.get("/ai-guesser/config").json()
    assert payload["enabled"] is False


def test_guess_endpoint_returns_normalized_payload(client, monkeypatch, enabled):
    install_client(
        monkeypatch,
        lambda: gemini_ok([{"answer": "star wars", "confidence": 0.74}]),
    )
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=10, window_seconds=60)
    )

    response = client.post("/ai-guesser/guess", json=body())
    assert response.status_code == 200

    payload = response.json()
    assert payload["guesses"] == [{"answer": "star wars", "confidence": 0.74}]
    assert payload["line"] == ""
    assert payload["drawing_version"] == 3
    assert payload["model"] == "AnAI 1.3 Pro"
    assert "latency_ms" in payload
    assert "gemini" not in response.text.lower()
    assert API_KEY not in response.text


def test_guess_endpoint_error_shape_is_predictable(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=10, window_seconds=60)
    )

    response = client.post("/ai-guesser/guess", json=body())
    assert response.status_code == 503
    payload = response.json()
    assert list(payload.keys()) == ["detail"]
    assert isinstance(payload["detail"], str)
    assert API_KEY not in response.text


def test_guess_endpoint_maps_timeout_to_504(client, monkeypatch, enabled):
    def boom():
        raise httpx.TimeoutException("slow")

    install_client(monkeypatch, boom)
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=10, window_seconds=60)
    )

    response = client.post("/ai-guesser/guess", json=body())
    assert response.status_code == 504
    assert response.json()["detail"]


def test_guess_endpoint_rejects_invalid_request(client, monkeypatch, enabled):
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=10, window_seconds=60)
    )
    response = client.post("/ai-guesser/guess", json=body(image_base64="short"))
    assert response.status_code == 422


def test_guess_endpoint_rate_limits(client, monkeypatch, enabled):
    install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=1, window_seconds=60)
    )
    sent: list[str] = []
    monkeypatch.setattr(
        ai_guesser_api, "send_limit_alert", lambda reason="": sent.append(reason)
    )

    assert client.post("/ai-guesser/guess", json=body()).status_code == 200
    throttled = client.post("/ai-guesser/guess", json=body())
    assert throttled.status_code == 429
    assert throttled.json()["detail"]
    assert sent == ["ip_minute"]


def test_guess_endpoint_daily_ip_limit(client, monkeypatch, enabled):
    install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=50, window_seconds=60)
    )
    monkeypatch.setattr(
        ai_guesser_api,
        "_daily_ip_limiter",
        SlidingWindowLimiter(limit=2, window_seconds=86_400),
    )
    sent: list[str] = []
    monkeypatch.setattr(
        ai_guesser_api, "send_limit_alert", lambda reason="": sent.append(reason)
    )

    assert client.post("/ai-guesser/guess", json=body()).status_code == 200
    assert client.post("/ai-guesser/guess", json=body()).status_code == 200
    assert client.post("/ai-guesser/guess", json=body()).status_code == 429
    assert sent == ["ip_daily"]


def test_guess_ignores_spoofed_forwarded_for(client, monkeypatch, enabled):
    install_client(
        monkeypatch, lambda: gemini_ok([{"answer": "dog", "confidence": 0.5}])
    )
    monkeypatch.setattr(settings, "ai_guesser_trust_forwarded_for", False)
    monkeypatch.setattr(
        ai_guesser_api, "_limiter", SlidingWindowLimiter(limit=1, window_seconds=60)
    )
    monkeypatch.setattr(ai_guesser_api, "send_limit_alert", lambda reason="": None)

    assert client.post(
        "/ai-guesser/guess",
        json=body(),
        headers={"X-Forwarded-For": "203.0.113.10"},
    ).status_code == 200
    # A second spoofed address still shares the TestClient socket identity.
    assert client.post(
        "/ai-guesser/guess",
        json=body(),
        headers={"X-Forwarded-For": "198.51.100.20"},
    ).status_code == 429
