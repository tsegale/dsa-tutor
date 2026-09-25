"""Streamed explanations (Week 1 addendum A2.4).

Unvalidated text is never shown: the explanation is revealed one whole
sentence at a time, each checked before release, and whatever was revealed
is the final explanation - it is never swapped out. Later fields that fail
take the fallback text on their own. Every scenario below checks that
invariant: the deltas the student saw are, joined, the final explanation."""

import json

import pytest
from fastapi.testclient import TestClient

from main import app
from routers import predictions
from services.claude_service import CallMetadata
from services.feedback_stream import JsonStringFieldStreamer, SentenceGate

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


def test_sentence_gate_releases_only_checked_sentences():
    gate = SentenceGate(lambda s: "bad" if "bad" in s else None, max_sentences=2)
    assert gate.feed("First one. Seco") == ["First one."]
    assert gate.feed("nd is bad. Third.") == []
    assert gate.closed and gate.failure == "bad" and gate.text == "First one."
    assert gate.finish() == []


def test_sentence_gate_does_not_split_decimals_and_judges_the_last_sentence_on_finish():
    gate = SentenceGate(lambda s: None, max_sentences=2)
    assert gate.feed("The value 3.5 stays") == []
    assert gate.finish() == ["The value 3.5 stays"]


REQUEST = {
    "algorithm_name": "Bubble Sort",
    "step_index": 1,
    "current_state": {"dataStructureState": [7, 3], "activeIndices": [0, 1], "criticalJunctionType": "SWAP_DECISION"},
    "student_answer": "no-swap",
    "error_history": [],
    "scaffolding_level": "HIGH",
    "session_id": "s",
    "pseudocode": "if arr[j] > arr[j+1] then swap arr[j] and arr[j+1]",
}

TWO_SENTENCES = "Skipping the swap leaves 7 before 3. The larger value stays on the left."


def fake_stream(text: str, *, fail_after: int | None = None, stop_reason: str = "end_turn"):
    async def stream_message(prompt, system, *, token_limit=None):
        for i in range(0, len(text), 5):
            if fail_after is not None and i >= fail_after:
                raise RuntimeError("upstream dropped")
            yield "text", text[i : i + 5]
        yield "done", CallMetadata(latency_ms=1, input_tokens=1, output_tokens=10, stop_reason=stop_reason)

    return stream_message


def run(monkeypatch, feedback_text: str, request: dict = REQUEST, **kwargs) -> tuple[list[str], dict]:
    """Returns (delta texts in order, final payload) and asserts the shared
    invariants: exactly one final event, last; the revealed sentences joined
    are exactly the final explanation."""
    monkeypatch.setattr(predictions, "stream_message", fake_stream(feedback_text, **kwargs))
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    with TestClient(app) as client:
        res = client.post("/api/v1/predictions/stream", json=request)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    parsed = []
    for block in res.text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        parsed.append((lines["event"], json.loads(lines["data"])))
    kinds = [kind for kind, _ in parsed]
    assert kinds.count("final") == 1 and kinds[-1] == "final"
    deltas = [data["text"] for kind, data in parsed if kind == "delta"]
    final = parsed[-1][1]
    if deltas:
        assert final["response"]["consequenceExplanation"] == " ".join(deltas)
    return deltas, final


def feedback(**override) -> str:
    return json.dumps({**VALID, "consequence_explanation": TWO_SENTENCES, **override})


def test_valid_stream_reveals_whole_sentences_then_finalises(monkeypatch):
    deltas, final = run(monkeypatch, feedback())
    assert deltas == ["Skipping the swap leaves 7 before 3.", "The larger value stays on the left."]
    assert final["outcome"] == "ai" and final["fallbackFields"] == [] and final["failureReason"] is None
    assert final["response"]["aiGenerated"] is True
    assert final["response"]["socraticHint"] == VALID["socratic_hint"]


def test_a_self_correcting_sentence_is_never_revealed(monkeypatch):
    text = "Skipping the swap leaves 7 before 3. Wait, actually the 3 moves."
    deltas, final = run(monkeypatch, feedback(consequence_explanation=text))
    assert deltas == ["Skipping the swap leaves 7 before 3."]
    # The explanation is what was shown - kept, not swapped.
    assert final["response"]["consequenceExplanation"] == "Skipping the swap leaves 7 before 3."
    assert final["failureReason"] == "consequence_explanation.self_correction"
    assert final["fallbackFields"] == []


def test_foreign_notation_is_never_revealed(monkeypatch):
    text = "The pseudocode compares A[i - 1] with A[i]. So they swap."
    deltas, final = run(monkeypatch, feedback(consequence_explanation=text))
    assert deltas == []
    assert final["failureReason"] == "consequence_explanation.notation"
    assert final["fallbackFields"][0] == "consequence_explanation"
    assert "A[i" not in final["response"]["consequenceExplanation"]
    assert final["response"]["aiGenerated"] is False


def test_a_third_sentence_is_held_back(monkeypatch):
    deltas, final = run(monkeypatch, feedback(consequence_explanation=TWO_SENTENCES + " And a third one."))
    assert len(deltas) == 2
    assert final["failureReason"] == "consequence_explanation.sentences"
    assert final["fallbackFields"] == []


def test_a_failing_hint_takes_the_fallback_but_the_visible_explanation_stands(monkeypatch):
    long_hint = " ".join(["word"] * 60)
    deltas, final = run(monkeypatch, feedback(socratic_hint=long_hint))
    assert len(deltas) == 2
    assert final["response"]["consequenceExplanation"] == TWO_SENTENCES
    assert final["fallbackFields"] == ["socratic_hint"]
    assert final["failureReason"] == "socratic_hint.words"
    assert final["outcome"] == "partial"
    assert final["response"]["socraticHint"] != long_hint
    assert final["response"]["aiGenerated"] is False


def test_a_truncated_response_never_reveals_its_unfinished_sentence(monkeypatch):
    text = '{"consequence_explanation": "Skipping the swap leaves 7 before 3. The larger val'
    deltas, final = run(monkeypatch, text, stop_reason="max_tokens")
    assert deltas == ["Skipping the swap leaves 7 before 3."]
    assert final["failureReason"] == "truncated"
    assert set(final["fallbackFields"]) == {"socratic_hint", "counterfactual_trace"}


def test_a_model_error_mid_stream_keeps_revealed_sentences_and_falls_back_for_the_rest(monkeypatch):
    deltas, final = run(monkeypatch, feedback(), fail_after=70)
    assert final["outcome"] == "error" and final["failureReason"] == "error"
    assert {"socratic_hint", "counterfactual_trace"} <= set(final["fallbackFields"])
    assert final["response"]["aiGenerated"] is False


def test_a_correct_answer_with_an_empty_explanation_is_valid(monkeypatch):
    correct = {**REQUEST, "student_answer": "swap"}
    deltas, final = run(monkeypatch, feedback(consequence_explanation="", counterfactual_trace=""), request=correct)
    assert deltas == []
    assert final["outcome"] == "ai" and final["fallbackFields"] == []
    assert final["response"]["correct"] is True


def test_a_complete_valid_stream_populates_the_cache(monkeypatch):
    stored: dict = {}
    monkeypatch.setattr(predictions, "stream_message", fake_stream(feedback()))
    monkeypatch.setattr(predictions, "CACHE_ENABLED", True)
    monkeypatch.setattr(predictions.feedback_cache, "get", lambda key: None)
    monkeypatch.setattr(predictions.feedback_cache, "set", lambda key, value: stored.update({key: value}))
    with TestClient(app) as client:
        client.post("/api/v1/predictions/stream", json=REQUEST)
    assert len(stored) == 1


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


def test_a_stalled_generation_is_cut_off_at_the_wall_clock_ceiling(monkeypatch):
    import asyncio
    import time

    async def stalls_after_first_sentence(prompt, system, *, token_limit=None):
        yield "text", '{"consequence_explanation": "Skipping the swap leaves 7 before 3. '
        await asyncio.sleep(30)  # model stalls; keep-alive pings would hide this from the SDK
        yield "text", "never arrives"

    monkeypatch.setattr(predictions, "request_timeout_seconds", 0.3)
    start = time.monotonic()
    monkeypatch.setattr(predictions, "stream_message", stalls_after_first_sentence)
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    with TestClient(app) as client:
        res = client.post("/api/v1/predictions/stream", json=REQUEST)
    elapsed = time.monotonic() - start
    blocks = res.text.strip().split("\n\n")
    finals = [b for b in blocks if b.startswith("event: final")]
    assert elapsed < 5
    assert len(finals) == 1
    final = json.loads(finals[0].split("data: ", 1)[1])
    assert final["outcome"] == "timeout" and final["failureReason"] == "timeout"
    assert final["response"]["consequenceExplanation"] == "Skipping the swap leaves 7 before 3."
