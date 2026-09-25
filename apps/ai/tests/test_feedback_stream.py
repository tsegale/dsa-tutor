"""Streamed explanations (Week 1 addendum A2.4).

The explanation is streamed as a preview while the model writes it; the
assembled response is still validated before anything is treated as
final, and a failed validation swaps the preview for the fallback."""

import json

import pytest
from fastapi.testclient import TestClient

from main import app
from routers import predictions
from services.claude_service import CallMetadata
from services.feedback_stream import JsonStringFieldStreamer

VALID = {
    "misconception_category": None,
    "consequence_explanation": "Skipping the swap leaves 7 before 3.",
    "counterfactual_trace": "The array stays [7, 3]. The 7 remains at index 0.",
    "socratic_hint": "Which highlighted value is larger?",
    "xp_awarded": 0,
}


def feed_all(field: str, chunks: list[str]) -> str:
    streamer = JsonStringFieldStreamer(field)
    return "".join(streamer.feed(chunk) for chunk in chunks)


def test_extracts_a_field_split_across_chunks():
    text = json.dumps(VALID)
    chunks = [text[i : i + 3] for i in range(0, len(text), 3)]
    assert feed_all("consequence_explanation", chunks) == VALID["consequence_explanation"]


def test_resolves_escapes_split_across_chunks():
    # A backslash, and a \u escape, each cut off at a chunk boundary.
    assert feed_all("f", ['{"f": "a\\', 'nb\\"c\\u00', 'e9"}']) == 'a\nb"cé'


def test_stops_at_the_closing_quote_and_ignores_later_fields():
    assert feed_all("a", ['{"a": "one", "b": "two"}']) == "one"


def test_finds_the_field_inside_a_code_fence():
    assert feed_all("a", ['```json\n{"a"', ': "x"}\n```']) == "x"


def test_emits_nothing_until_the_field_appears():
    streamer = JsonStringFieldStreamer("a")
    assert streamer.feed('{"b": "zzz", ') == ""
    assert streamer.feed('"a": "hi"}') == "hi"


REQUEST = {
    "algorithm_name": "Bubble Sort",
    "step_index": 1,
    "current_state": {"dataStructureState": [7, 3], "activeIndices": [0, 1], "criticalJunctionType": "SWAP_DECISION"},
    "student_answer": "no-swap",
    "error_history": [],
    "scaffolding_level": "MEDIUM",
    "session_id": "s",
    "pseudocode": "if arr[j] > arr[j+1] then swap arr[j] and arr[j+1]",
}


def fake_stream(text: str, *, fail_after: int | None = None, stop_reason: str = "end_turn"):
    async def stream_message(prompt, system, *, token_limit=None):
        for i in range(0, len(text), 5):
            if fail_after is not None and i >= fail_after:
                raise RuntimeError("upstream dropped")
            yield "text", text[i : i + 5]
        yield "done", CallMetadata(latency_ms=1, input_tokens=1, output_tokens=10, stop_reason=stop_reason)

    return stream_message


def events(monkeypatch, stream) -> list[tuple[str, dict]]:
    monkeypatch.setattr(predictions, "stream_message", stream)
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    with TestClient(app) as client:
        res = client.post("/api/v1/predictions/stream", json=REQUEST)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    parsed = []
    for block in res.text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        parsed.append((lines["event"], json.loads(lines["data"])))
    return parsed


def test_valid_stream_previews_the_explanation_then_finalises(monkeypatch):
    got = events(monkeypatch, fake_stream(json.dumps(VALID)))
    deltas = [e for e in got if e[0] == "delta"]
    finals = [e for e in got if e[0] == "final"]
    assert "".join(d[1]["text"] for d in deltas) == VALID["consequence_explanation"]
    assert len(finals) == 1 and got[-1][0] == "final"
    final = finals[0][1]
    assert final["outcome"] == "ai" and final["replaced"] is False
    assert final["response"]["consequenceExplanation"] == VALID["consequence_explanation"]
    assert final["response"]["correct"] is False


def test_invalid_stream_is_replaced_by_the_fallback(monkeypatch):
    bad = {**VALID, "socratic_hint": " ".join(["word"] * 60)}
    final = events(monkeypatch, fake_stream(json.dumps(bad)))[-1][1]
    assert final["outcome"] == "fallback"
    assert final["failureReason"] == "socratic_hint.words"
    assert final["replaced"] is True
    assert final["response"]["aiGenerated"] is False


def test_truncated_stream_is_replaced(monkeypatch):
    final = events(monkeypatch, fake_stream(json.dumps(VALID), stop_reason="max_tokens"))[-1][1]
    assert final["outcome"] == "fallback" and final["failureReason"] == "truncated"


def test_a_dropped_stream_still_ends_with_one_final_event(monkeypatch):
    got = events(monkeypatch, fake_stream(json.dumps(VALID), fail_after=60))
    assert [e[0] for e in got].count("final") == 1
    assert got[-1][1]["outcome"] == "error"
    assert got[-1][1]["response"]["aiGenerated"] is False


def test_a_cache_hit_sends_only_the_final_event(monkeypatch):
    monkeypatch.setattr(predictions, "stream_message", fake_stream("never called"))
    monkeypatch.setattr(predictions.feedback_cache, "get", lambda key: dict(VALID))
    monkeypatch.setattr(predictions, "CACHE_ENABLED", True)
    with TestClient(app) as client:
        res = client.post("/api/v1/predictions/stream", json=REQUEST)
    blocks = res.text.strip().split("\n\n")
    assert len(blocks) == 1 and blocks[0].startswith("event: final")
    assert json.loads(blocks[0].split("data: ", 1)[1])["outcome"] == "cache"


@pytest.mark.parametrize("path", ["/api/v1/predictions/", "/api/v1/predictions/stream"])
def test_both_endpoints_agree_on_the_verdict(monkeypatch, path):
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    monkeypatch.setattr(predictions, "stream_message", fake_stream(json.dumps(VALID)))

    async def attempt(prompt, system, *, retry_reason, token_limit=None):
        return dict(VALID), CallMetadata(latency_ms=1, input_tokens=1, output_tokens=1)

    monkeypatch.setattr(predictions, "attempt_feedback", attempt)
    with TestClient(app) as client:
        res = client.post(path, json=REQUEST)
    body = res.json() if path.endswith("/") else json.loads(res.text.strip().split("\n\n")[-1].split("data: ", 1)[1])["response"]
    assert body["correct"] is False
    assert body["socraticHint"] == VALID["socratic_hint"]
