from fastapi.testclient import TestClient

from main import app
from services import metrics


def setup_function() -> None:
    metrics.reset_for_tests()


def test_counts_cache_hits_and_latency_percentiles() -> None:
    metrics.record_call(100, cache_read_tokens=0, cache_write_tokens=900)
    metrics.record_call(200, cache_read_tokens=900, cache_write_tokens=0)
    metrics.record_call(300, cache_read_tokens=900, cache_write_tokens=0)
    snap = metrics.snapshot()
    assert snap["calls"] == 3
    assert snap["cache_hit_rate"] == round(2 / 3, 3)
    assert snap["cache_read_share"] == round(1800 / 2700, 3)
    assert snap["latency_ms_p50"] == 200
    assert snap["latency_ms_p95"] == 300


def test_empty_counters_report_none_not_zero() -> None:
    snap = metrics.snapshot()
    assert snap["calls"] == 0
    assert snap["cache_hit_rate"] is None
    assert snap["latency_ms_p50"] is None


def test_metrics_endpoint_serves_the_snapshot() -> None:
    metrics.record_call(150, cache_read_tokens=10, cache_write_tokens=0)
    response = TestClient(app).get("/metrics")
    assert response.status_code == 200
    assert response.json()["calls"] == 1
