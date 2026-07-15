"""Static word list helpers for Skribbl-style word selection."""

from __future__ import annotations

import json
import random
import re
from functools import lru_cache
from pathlib import Path

_WORDS_PATH = Path(__file__).resolve().parent.parent / "data" / "words.json"
_WHITESPACE_RE = re.compile(r"\s+")


@lru_cache(maxsize=1)
def load_words() -> tuple[str, ...]:
    raw = json.loads(_WORDS_PATH.read_text(encoding="utf-8"))
    words = tuple(sorted({str(item).strip().lower() for item in raw if str(item).strip()}))
    if len(words) < 3:
        raise RuntimeError("Word list must contain at least 3 words.")
    return words


def pick_word_choices(count: int = 3, *, exclude: set[str] | None = None) -> list[str]:
    pool = list(load_words())
    if exclude:
        filtered = [word for word in pool if word not in exclude]
        if len(filtered) >= count:
            pool = filtered
    if len(pool) < count:
        raise RuntimeError("Not enough words available.")
    return random.sample(pool, count)


def normalize_guess(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", text.strip().lower())


def word_hint_mask(word: str) -> str:
    """Public mask like `_ _ _   _ _ _` for multi-word prompts."""
    chars: list[str] = []
    for ch in word:
        if ch == " ":
            chars.append(" ")
        else:
            chars.append("_")
    return " ".join(chars)


def words_match(secret: str, guess: str) -> bool:
    return normalize_guess(secret) == normalize_guess(guess)
