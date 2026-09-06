"""Schemas for the experimental /ai-guesser demo mode.

Two distinct layers live here on purpose:

* `AiGuessRequest` / `AiGuessResponse` — our own public API contract.
* `GeminiGuessPayload` — the *untrusted* model output, validated before use.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CandidateMode = Literal["game", "open"]

MAX_CANDIDATES = 64
MAX_CANDIDATE_LENGTH = 48
MAX_PREVIOUS_GUESSES = 3
MAX_GUESSES = 3
# Spoken aside for upcoming TTS. Empty/missing is allowed.
MAX_LINE_LENGTH = 140

_DATA_URL_PREFIX = re.compile(r"^data:[^;,]*;base64,", re.IGNORECASE)


def _clean_labels(values: list[str], *, limit: int) -> list[str]:
    """Trim, drop blanks, de-duplicate case-insensitively, and cap length."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        if not isinstance(raw, str):
            continue
        cleaned = " ".join(raw.split())[:MAX_CANDIDATE_LENGTH].strip()
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(cleaned)
        if len(out) >= limit:
            break
    return out


class AiGuessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Base64 image bytes. A `data:` URL prefix is tolerated and stripped.
    image_base64: str = Field(min_length=32)
    mime_type: Literal["image/png", "image/jpeg", "image/webp"] = "image/png"
    # Echoed back verbatim so the client can discard superseded responses.
    drawing_version: int = Field(default=0, ge=0)
    mode: CandidateMode = "game"
    # Accepted for older clients; never forwarded to the model.
    candidates: list[str] = Field(default_factory=list)
    previous_guesses: list[str] = Field(default_factory=list)

    @field_validator("image_base64")
    @classmethod
    def strip_data_url(cls, value: str) -> str:
        return _DATA_URL_PREFIX.sub("", value.strip())

    @field_validator("candidates")
    @classmethod
    def clean_candidates(cls, value: list[str]) -> list[str]:
        return _clean_labels(value, limit=MAX_CANDIDATES)

    @field_validator("previous_guesses")
    @classmethod
    def clean_previous(cls, value: list[str]) -> list[str]:
        return _clean_labels(value, limit=MAX_PREVIOUS_GUESSES)


class AiGuessItem(BaseModel):
    answer: str
    confidence: float = Field(ge=0.0, le=1.0)


class AiGuessUsage(BaseModel):
    """Token counts as reported by Gemini. Absent when the API omits them."""

    prompt_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


class AiGuessResponse(BaseModel):
    guesses: list[AiGuessItem]
    # Short speakable aside. Empty when the model omitted one.
    line: str = ""
    model: str
    mode: CandidateMode
    drawing_version: int
    latency_ms: int
    usage: AiGuessUsage | None = None


class AiGuesserConfigResponse(BaseModel):
    """Capability probe so the UI can show availability without burning a call."""

    enabled: bool
    model: str
    min_call_interval_ms: int
    tts_enabled: bool = False


class AiSpeakRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=160)

    @field_validator("text")
    @classmethod
    def clean_speech_text(cls, value: str) -> str:
        cleaned = " ".join(value.split()).strip()
        if not cleaned:
            raise ValueError("Speech text is empty.")
        return cleaned[:160]


# --- Untrusted model output -------------------------------------------------


class GeminiGuess(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str = Field(min_length=1, max_length=80)
    # Deliberately unconstrained: models emit 0-100, negatives, and NaN.
    # Normalization/clamping happens in the service.
    confidence: float


class GeminiGuessPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    guesses: list[GeminiGuess] = Field(default_factory=list)
    # Untrusted: missing/null/non-string becomes "" and is capped later.
    line: str = ""

    @field_validator("line", mode="before")
    @classmethod
    def coerce_line(cls, value: object) -> str:
        if not isinstance(value, str):
            return ""
        return value
