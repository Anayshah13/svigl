"""Tiny in-process sliding-window limiter.

Intended for cheap abuse protection on unauthenticated demo endpoints. It is
per-process, so with multiple workers the effective limit is
`limit x worker_count`. Move to Redis if a hard global limit is ever needed.
"""

from __future__ import annotations

import time
from collections import deque


class SlidingWindowLimiter:
    def __init__(self, *, limit: int, window_seconds: float) -> None:
        self._limit = max(1, limit)
        self._window = max(0.001, window_seconds)
        self._hits: dict[str, deque[float]] = {}

    def peek(self, key: str, *, now: float | None = None) -> bool:
        """True when `allow` would succeed. Does not record a hit."""
        moment = time.monotonic() if now is None else now
        bucket = self._bucket(key, moment)
        return len(bucket) < self._limit

    def allow(self, key: str, *, now: float | None = None) -> bool:
        """Record a hit and report whether it is within budget."""
        moment = time.monotonic() if now is None else now
        bucket = self._bucket(key, moment)
        if len(bucket) >= self._limit:
            return False
        bucket.append(moment)
        return True

    def _bucket(self, key: str, moment: float) -> deque[float]:
        cutoff = moment - self._window
        bucket = self._hits.get(key)
        if bucket is None:
            bucket = deque()
            self._hits[key] = bucket
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(self._hits) > 1024:
            self._prune(cutoff)
        return bucket

    def _prune(self, cutoff: float) -> None:
        stale = [
            key
            for key, hits in self._hits.items()
            if not hits or hits[-1] <= cutoff
        ]
        for key in stale:
            self._hits.pop(key, None)

    def reset(self) -> None:
        self._hits.clear()
