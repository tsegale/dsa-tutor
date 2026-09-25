"""Bounded retries (Week 1 addendum A2.1/A2.2).

The old flow nested a JSON-parse retry inside a validation retry, so one
prediction could make four sequential Claude calls - the source of the
~22s tail. Now: at most one retry, hard-capped at retry_budget_seconds,
and every retry names the validator rule that triggered it."""

import asyncio
import time

import pytest

from models.request_models import ScaffoldingLevel
from routers.predictions import _feedback_failure
from services import claude_service
from services.claude_service import CallMetadata, call_with_bounded_retry

META = CallMetadata(latency_ms=1, input_tokens=1, output_tokens=1)


def _scripted(replies: list):
    """An attempt() that returns the next scripted reply and records calls."""
    calls: list[str | None] = []

    async def attempt(retry_reason: str | None):
        calls.append(retry_reason)
        reply = replies[len(calls) - 1]
        if isinstance(reply, float):
            await asyncio.sleep(reply)
            return "slow", META
        return reply, META

    return attempt, calls


def _fails_on(bad: str):
    return lambda value: "rule.x" if value == bad else None


def test_valid_first_call_makes_exactly_one_call():
    attempt, calls = _scripted(["good"])
    result = asyncio.run(call_with_bounded_retry(attempt, _fails_on("bad"), "t"))
    assert (result.value, result.attempts, result.retry_reason, calls) == ("good", 1, None, [None])


def test_one_retry_passes_the_failing_rule_through():
    attempt, calls = _scripted(["bad", "good"])
    result = asyncio.run(call_with_bounded_retry(attempt, _fails_on("bad"), "t"))
    assert result.value == "good"
    assert result.attempts == 2
    assert result.retry_reason == "rule.x"
    assert calls == [None, "rule.x"]


def test_never_more_than_two_calls():
    attempt, calls = _scripted(["bad", "bad", "good", "good"])
    result = asyncio.run(call_with_bounded_retry(attempt, _fails_on("bad"), "t"))
    assert result.value is None
    assert result.failure_reason == "rule.x"
    assert len(calls) == 2


def test_retry_is_cut_off_at_the_wall_clock_budget(monkeypatch):
    monkeypatch.setattr(claude_service, "retry_budget_seconds", 0.05)
    attempt, calls = _scripted(["bad", 2.0])
    start = time.monotonic()
    result = asyncio.run(call_with_bounded_retry(attempt, _fails_on("bad"), "t"))
    assert time.monotonic() - start < 1.0
    assert result.value is None
    assert result.failure_reason == "retry_timeout"
    assert len(calls) == 2


def test_first_call_errors_propagate_to_the_callers_fallback():
    async def attempt(retry_reason):
        raise RuntimeError("upstream down")

    with pytest.raises(RuntimeError):
        asyncio.run(call_with_bounded_retry(attempt, _fails_on("bad"), "t"))


def test_json_failure_retry_carries_the_json_reminder(monkeypatch):
    prompts: list[str] = []

    async def fake_create(prompt, system, **kwargs):
        prompts.append(prompt)
        return ("not json" if len(prompts) == 1 else '{"ok": true}'), META

    monkeypatch.setattr(claude_service, "_create_message", fake_create)
    result = asyncio.run(
        call_with_bounded_retry(
            lambda reason: claude_service.attempt_feedback("P", None, retry_reason=reason),
            lambda feedback: "json_parse" if feedback is None else None,
            "t",
        )
    )
    assert result.value == {"ok": True}
    assert result.retry_reason == "json_parse"
    assert prompts[0] == "P"
    assert prompts[1] == "P" + claude_service.JSON_RETRY_SUFFIX


def test_budgeted_retry_disables_sdk_retries_and_uses_the_budget_timeout(monkeypatch):
    seen: list[dict] = []

    async def fake_create(prompt, system, **kwargs):
        seen.append(kwargs)
        return "{}", META

    monkeypatch.setattr(claude_service, "_create_message", fake_create)
    asyncio.run(claude_service.attempt_feedback("P", None, retry_reason=None))
    asyncio.run(claude_service.attempt_feedback("P", None, retry_reason="socratic_hint.words"))
    assert seen[0]["max_retries"] is None and seen[0]["timeout"] is None
    assert seen[1]["max_retries"] == 0
    assert seen[1]["timeout"] == claude_service.retry_budget_seconds


VALID = {
    "consequence_explanation": "Leaving them keeps the larger value on the left.",
    "counterfactual_trace": "The array stays [5, 3]. The 5 remains at index 0.",
    "socratic_hint": "Which highlighted value is larger?",
}


@pytest.mark.parametrize(
    ("override", "expected"),
    [
        ({}, None),
        ({"consequence_explanation": ""}, "consequence_explanation.empty"),
        ({"consequence_explanation": "One. Two. Three."}, "consequence_explanation.sentences"),
        ({"socratic_hint": " ".join(["word"] * 30)}, "socratic_hint.words"),
        ({"socratic_hint": "Wait, actually which is larger?"}, "socratic_hint.self_correction"),
        ({"counterfactual_trace": "A. B. C."}, "counterfactual_trace.sentences"),
    ],
)
def test_feedback_failure_names_the_rule(override, expected):
    assert _feedback_failure({**VALID, **override}, False, ScaffoldingLevel.LOW) == expected


def test_feedback_failure_names_parse_and_notation_failures():
    assert _feedback_failure(None, False, ScaffoldingLevel.LOW) == "json_parse"
    assert _feedback_failure(["not", "a", "dict"], False, ScaffoldingLevel.LOW) == "json_shape"
    notation = {**VALID, "socratic_hint": "Is A[i] larger?"}
    assert _feedback_failure(notation, False, ScaffoldingLevel.LOW, None, "if arr[j] > arr[j+1]") == "socratic_hint.notation"


def test_an_empty_explanation_is_valid_only_for_a_correct_answer():
    # A2.2 measurement: 15 of 15 retries were correct answers whose
    # explanation the model (rightly) left empty.
    empty = {**VALID, "consequence_explanation": "", "counterfactual_trace": ""}
    assert _feedback_failure(empty, True, ScaffoldingLevel.HIGH) is None
    assert _feedback_failure(empty, False, ScaffoldingLevel.HIGH) == "consequence_explanation.empty"
