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


def letter_slot_indices(word: str) -> list[int]:
    """Character indices in `word` that are guessable letters (not spaces)."""
    return [index for index, ch in enumerate(word) if ch != " "]


def word_hint_mask(word: str, revealed: set[int] | frozenset[int] | None = None) -> str:
    """Public mask like `_ _ _   _ _ _`, optionally with some letters revealed."""
    revealed = revealed or set()
    chars: list[str] = []
    for index, ch in enumerate(word):
        if ch == " ":
            chars.append(" ")
        elif index in revealed:
            chars.append(ch)
        else:
            chars.append("_")
    return " ".join(chars)


def spaced_word(word: str) -> str:
    """Full word in hint slot format (`c a t s`)."""
    return word_hint_mask(word, set(range(len(word))))


def words_match(secret: str, guess: str) -> bool:
    return normalize_guess(secret) == normalize_guess(guess)


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        cur = [i]
        for j, cb in enumerate(b, start=1):
            insert = cur[j - 1] + 1
            delete = prev[j] + 1
            replace = prev[j - 1] + (0 if ca == cb else 1)
            cur.append(min(insert, delete, replace))
        prev = cur
    return prev[-1]


def close_guess_threshold(word_length: int) -> int:
    """Max Levenshtein distance considered 'close' for a word of this length."""
    if word_length <= 0:
        return 0
    if word_length <= 3:
        return 1
    if word_length <= 6:
        return 2
    return max(2, word_length // 4)


def is_close_guess(secret: str, guess: str) -> bool:
    """True when guess is near the secret but not exact (Skribbl-style)."""
    s = normalize_guess(secret)
    g = normalize_guess(guess)
    if not g or g == s:
        return False
    # Ignore wildly different lengths.
    if abs(len(s) - len(g)) > close_guess_threshold(len(s)):
        return False
    return levenshtein(s, g) <= close_guess_threshold(len(s))


def letters_to_reveal_count(word: str) -> int:
    """How many letter slots will eventually be revealed during the round."""
    n = len(letter_slot_indices(word))
    if n <= 1:
        return 0
    if n == 2:
        return 1
    # Leave about half blank so the word is still guessable.
    return max(1, n // 2)


def hint_reveal_interval_seconds(word: str, round_duration_seconds: int) -> float:
    """Seconds between progressive letter reveals (capped)."""
    count = max(letters_to_reveal_count(word), 1)
    raw = float(round_duration_seconds) / float(count)
    # Longer words → more reveals → shorter raw interval; keep in a sensible band.
    return max(4.0, min(18.0, raw))


def reveal_order(word: str, *, seed: str) -> list[int]:
    """Deterministic order of letter indices to reveal."""
    indices = letter_slot_indices(word)
    if not indices:
        return []
    # Fisher–Yates with a simple seeded LCG so all servers agree.
    state = 2166136261
    for ch in seed:
        state ^= ord(ch)
        state = (state * 16777619) & 0xFFFFFFFF
    order = list(indices)
    for i in range(len(order) - 1, 0, -1):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        j = state % (i + 1)
        order[i], order[j] = order[j], order[i]
    return order


def target_reveal_count(
    word: str,
    *,
    round_duration_seconds: int,
    elapsed_seconds: float,
) -> int:
    """How many letters should be visible given elapsed round time."""
    total = letters_to_reveal_count(word)
    if total <= 0:
        return 0
    interval = hint_reveal_interval_seconds(word, round_duration_seconds)
    return min(total, int(elapsed_seconds // interval))
