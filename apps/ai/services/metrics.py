"""In-process counters for every Claude call since this instance started
(Week 4 4D.4), served at GET /metrics and surfaced on the educator
dashboard through the api. Counts only - never prompt or response text.

Per instance and reset on deploy: enough to see latency and whether prompt
caching is working right now. The study's fallback rate is computed from
the interaction log instead, where it is durable."""

import threading
import time
from collections import deque

_WINDOW = 500

_lock = threading.Lock()
_started_at = time.time()
_calls = 0
_cache_hits = 0
_cache_read_tokens = 0
_cache_write_tokens = 0
_latencies_ms: deque[int] = deque(maxlen=_WINDOW)


def record_call(latency_ms: int, cache_read_tokens: int, cache_write_tokens: int) -> None:
    global _calls, _cache_hits, _cache_read_tokens, _cache_write_tokens
    with _lock:
        _calls += 1
        if cache_read_tokens > 0:
            _cache_hits += 1
        _cache_read_tokens += cache_read_tokens
        _cache_write_tokens += cache_write_tokens
        _latencies_ms.append(latency_ms)


def _percentile(sorted_values: list[int], fraction: float) -> int | None:
    if not sorted_values:
        return None
    index = min(len(sorted_values) - 1, round(fraction * (len(sorted_values) - 1)))
    return sorted_values[index]


def snapshot() -> dict:
    with _lock:
        latencies = sorted(_latencies_ms)
        cached = _cache_read_tokens + _cache_write_tokens
        return {
            "since": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(_started_at)),
            "calls": _calls,
            # Share of calls that read the cached prompt prefix at all.
            "cache_hit_rate": round(_cache_hits / _calls, 3) if _calls else None,
            # Share of cacheable prompt tokens served from the cache.
            "cache_read_share": round(_cache_read_tokens / cached, 3) if cached else None,
            "latency_ms_p50": _percentile(latencies, 0.5),
            "latency_ms_p95": _percentile(latencies, 0.95),
            "latency_window": len(latencies),
        }


def reset_for_tests() -> None:
    global _calls, _cache_hits, _cache_read_tokens, _cache_write_tokens
    with _lock:
        _calls = _cache_hits = _cache_read_tokens = _cache_write_tokens = 0
        _latencies_ms.clear()
