"""Sample real drawings from Google's Quick, Draw! simplified ndjson dump.

Source: https://github.com/googlecreativelab/quickdraw-dataset
Files: https://storage.googleapis.com/quickdraw_dataset/full/simplified/{class}.ndjson
License: CC BY 4.0
"""

from __future__ import annotations

import asyncio
import json
import logging
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

SIMPLIFIED_BASE = (
    "https://storage.googleapis.com/quickdraw_dataset/full/simplified"
)
DATASET_REPO = "https://github.com/googlecreativelab/quickdraw-dataset"

ALLOWED_WORDS = frozenset(
    {
        "cat",
        "dog",
        "fish",
        "bird",
        "house",
        "car",
        "tree",
        "apple",
        "cup",
        "hat",
        "star",
        "moon",
        "chair",
        "shoe",
        "flower",
        "pizza",
        "clock",
        "key",
        "boat",
        "sun",
        "guitar",
        "book",
        "ice cream",
        "bicycle",
    }
)

_cache: dict[str, dict] = {}
_word_locks: dict[str, asyncio.Lock] = {}


def _lock_for(word: str) -> asyncio.Lock:
    lock = _word_locks.get(word)
    if lock is None:
        lock = asyncio.Lock()
        _word_locks[word] = lock
    return lock


class QuickDrawError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _is_stroke_set(drawing: object) -> bool:
    if not isinstance(drawing, list) or not drawing:
        return False
    for stroke in drawing:
        if not isinstance(stroke, list) or len(stroke) != 2:
            return False
        xs, ys = stroke
        if not isinstance(xs, list) or not isinstance(ys, list):
            return False
        if len(xs) == 0 or len(xs) != len(ys):
            return False
    return True


def _skip_count(word: str) -> int:
    """Skip the first, overly clean drawings in each class file."""
    return 90 + (sum(ord(ch) for ch in word) % 80)


def _pack(word: str, row: dict) -> dict:
    return {
        "word": word,
        "key_id": str(row.get("key_id", "")),
        "recognized": bool(row.get("recognized")),
        "countrycode": row.get("countrycode"),
        "drawing": row["drawing"],
    }


async def _sample_drawing(word: str, client: httpx.AsyncClient) -> dict:
    cached = _cache.get(word)
    if cached:
        return cached

    skip = _skip_count(word)
    url = f"{SIMPLIFIED_BASE}/{quote(word)}.ndjson"
    try:
        async with client.stream("GET", url) as response:
            if response.status_code == 404:
                raise QuickDrawError(f"No Quick, Draw! file for '{word}'.", 404)
            if response.status_code >= 400:
                raise QuickDrawError(
                    f"Quick, Draw! storage returned {response.status_code}.",
                    502,
                )
            scanned = 0
            kept = 0
            fallback: dict | None = None
            async for line in response.aiter_lines():
                if not line:
                    continue
                scanned += 1
                if scanned > 900:
                    break
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("word") != word:
                    continue
                if not _is_stroke_set(row.get("drawing")):
                    continue
                kept += 1
                if kept <= skip:
                    continue
                sample = _pack(word, row)
                # Unrecognized doodles are the ones Google's in-game classifier missed.
                if sample["recognized"] is False:
                    _cache[word] = sample
                    return sample
                if fallback is None:
                    fallback = sample
                if kept >= skip + 120 and fallback is not None:
                    break
            if fallback is not None:
                _cache[word] = fallback
                return fallback
    except httpx.HTTPError as exc:
        logger.warning("quickdraw fetch failed for %s: %s", word, type(exc).__name__)
        raise QuickDrawError("Could not download Quick, Draw! strokes.") from exc

    raise QuickDrawError(f"No usable drawing found for '{word}'.")


async def load_samples(words: list[str]) -> list[dict]:
    unique: list[str] = []
    seen: set[str] = set()
    for raw in words:
        word = raw.strip().lower()
        if word in seen:
            continue
        if word not in ALLOWED_WORDS:
            raise QuickDrawError(f"Unsupported Quick, Draw! class '{raw}'.", 400)
        seen.add(word)
        unique.append(word)

    if not unique:
        raise QuickDrawError("Pick at least one Quick, Draw! class.", 400)

    timeout = httpx.Timeout(30.0, connect=10.0)
    sem = asyncio.Semaphore(4)

    async def one(word: str, client: httpx.AsyncClient) -> dict:
        async with sem:
            async with _lock_for(word):
                if word in _cache:
                    return _cache[word]
                return await _sample_drawing(word, client)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(one(word, client) for word in unique),
            return_exceptions=True,
        )

    samples: list[dict] = []
    for word, result in zip(unique, results, strict=True):
        if isinstance(result, Exception):
            logger.warning("quickdraw skipped %s: %s", word, result)
            continue
        samples.append(result)

    if not samples:
        raise QuickDrawError("Could not download Quick, Draw! strokes.")
    return samples
