"""Prompt caching (Week 1 addendum A2, follow-up).

Caching must be an infrastructure change only: the model reads exactly the
text it read before, the cacheable prefix is stable across calls on one
algorithm, and the usage accounting proves whether it hit."""

import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from main import app
from models.request_models import PredictionRequest
from prompts.templates import FEEDBACK_SYSTEM_PROMPT, FEEDBACK_USER_TEMPLATE
from routers import predictions
from services import claude_service
from services.claude_service import CallMetadata, _metadata


def request(**override) -> PredictionRequest:
    base = {
        "algorithm_name": "Bubble Sort",
        "step_index": 3,
        "current_state": {"dataStructureState": [7, 3, 5], "activeIndices": [0, 1], "criticalJunctionType": "SWAP_DECISION"},
        "student_answer": "no-swap",
        "error_history": [],
        "scaffolding_level": "HIGH",
        "session_id": "s",
        "pseudocode": "if arr[j] > arr[j+1] then swap arr[j] and arr[j+1]",
    }
    return PredictionRequest(**{**base, **override})


def test_the_split_blocks_rejoin_to_exactly_the_old_single_prompt():
    rendered = FEEDBACK_USER_TEMPLATE.format(
        algorithm_context="CTX", pseudocode="PC", step_index=1, current_state={"a": 1}, student_answer="swap",
        correct="incorrect", error_history=[], scaffolding_level="HIGH", junction_type="SWAP_DECISION",
        junction_difficulty="PROCEDURAL", junction_guidance="G", comparison_context="C",
    )
    static, dynamic = predictions._split_for_cache(rendered)
    assert static["text"] + "\n\n" + dynamic["text"] == rendered
    assert "cache_control" in static and "cache_control" not in dynamic
    assert dynamic["text"].startswith("Current step index:")
    assert "CTX" in static["text"] and "PC" in static["text"]


def test_the_cached_prefix_is_stable_per_algorithm_and_differs_between_them():
    a = predictions._prepare_prediction(request())
    b = predictions._prepare_prediction(request(step_index=9, student_answer="swap",
                                                current_state={"dataStructureState": [1, 9], "activeIndices": [0, 1]}))
    other = predictions._prepare_prediction(request(algorithm_name="Binary Search Tree", pseudocode="search(node, v)"))
    assert a.prompt[0] == b.prompt[0]
    assert a.prompt[1] != b.prompt[1]
    assert a.prompt[0] != other.prompt[0]


def test_the_stream_sends_both_breakpoints(monkeypatch):
    seen: dict = {}

    async def capture(prompt, system, *, token_limit=None):
        seen["prompt"], seen["system"] = prompt, system
        yield "text", json.dumps({"consequence_explanation": "", "counterfactual_trace": "", "socratic_hint": "Which is larger?"})
        yield "done", CallMetadata(latency_ms=1, input_tokens=5, output_tokens=5)

    monkeypatch.setattr(predictions, "stream_message", capture)
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    with TestClient(app) as client:
        client.post("/api/v1/predictions/stream", json=request(student_answer="swap").model_dump(mode="json"))
    assert seen["system"] == [{"type": "text", "text": FEEDBACK_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]
    assert "cache_control" in seen["prompt"][0] and "cache_control" not in seen["prompt"][1]


def test_the_ttl_switch(monkeypatch):
    assert claude_service.cache_control() == {"type": "ephemeral"}
    monkeypatch.setattr(claude_service, "cache_ttl", "1h")
    assert claude_service.cache_control() == {"type": "ephemeral", "ttl": "1h"}


def test_the_final_event_reports_cache_accounting(monkeypatch):
    async def fake(prompt, system, *, token_limit=None):
        yield "text", json.dumps({"consequence_explanation": "", "counterfactual_trace": "", "socratic_hint": "Which is larger?"})
        yield "done", CallMetadata(latency_ms=900, input_tokens=120, output_tokens=40,
                                   cache_creation_input_tokens=0, cache_read_input_tokens=1800, first_token_ms=610)

    monkeypatch.setattr(predictions, "stream_message", fake)
    monkeypatch.setattr(predictions, "CACHE_ENABLED", False)
    with TestClient(app) as client:
        res = client.post("/api/v1/predictions/stream", json=request(student_answer="swap").model_dump(mode="json"))
    final = json.loads(res.text.strip().split("\n\n")[-1].split("data: ", 1)[1])
    assert final["diagnostics"] == {
        "inputTokens": 120, "cacheWriteTokens": 0, "cacheReadTokens": 1800, "outputTokens": 40, "firstTokenMs": 610,
    }


def test_usage_without_cache_fields_reads_as_zero():
    usage = SimpleNamespace(input_tokens=10, output_tokens=2)
    meta = _metadata(usage, started=0.0, stop_reason="end_turn")
    assert (meta.cache_creation_input_tokens, meta.cache_read_input_tokens) == (0, 0)
