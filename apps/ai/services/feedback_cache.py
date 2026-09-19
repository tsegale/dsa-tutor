import hashlib
import json
import os
import time
from collections import OrderedDict
from typing import Any

# Students hit the same junction with the same wrong (or right) answer
# repeatedly - especially early in a session, or across different students
# on the same seeded array. Two requests with an identical key would get
# word-for-word identical feedback from the model anyway, so serving the
# cached copy is free latency and cost with no quality tradeoff. Never
# populated from a fallback response - a degraded response must never be
# served back out as if it were a fresh one.
CACHE_ENABLED = os.getenv("AI_CACHE_ENABLED", "true").lower() != "false"
CACHE_TTL_SECONDS = float(os.getenv("AI_CACHE_TTL_SECONDS", "300"))
CACHE_MAX_ENTRIES = int(os.getenv("AI_CACHE_MAX_ENTRIES", "500"))


def make_cache_key(
    algorithm_name: str,
    junction_type: str | None,
    current_state: Any,
    student_answer: str | None,
    scaffolding_level: str,
    correct: bool,
) -> str:
    payload = json.dumps(
        {
            "algorithm_name": algorithm_name,
            "junction_type": junction_type,
            "current_state": current_state,
            "student_answer": student_answer,
            "scaffolding_level": scaffolding_level,
            "correct": correct,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class TTLLRUCache:
    """Bounded by entry count (LRU eviction) and by age (TTL expiry) - a
    plain dict would grow without bound over a long-running process, and a
    plain LRU cache would keep serving stale feedback forever for a
    frequently-hit junction."""

    def __init__(self, max_entries: int, ttl_seconds: float):
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.monotonic() + self._ttl_seconds, value)
        self._store.move_to_end(key)
        while len(self._store) > self._max_entries:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()


feedback_cache = TTLLRUCache(max_entries=CACHE_MAX_ENTRIES, ttl_seconds=CACHE_TTL_SECONDS)
