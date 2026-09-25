"""Hints and feedback must use the Pseudocode tab's notation (Week 1, 1A.1).

A live hint read "The pseudocode says 'if A[i - 1] > A[i] then swap'" while
the student's Pseudocode tab showed arr[j] > arr[j+1] - the hint asserted
something false about what the student could see."""

import asyncio

from models.request_models import HintRequest, ScaffoldingLevel
from routers import hints
from routers.predictions import _feedback_is_valid
from services.claude_service import CallMetadata, uses_foreign_array_notation

TAB_PSEUDOCODE = "\n".join(
    [
        "for i from 0 to n-1 do",
        "  for j from 0 to n-i-2 do",
        "    if arr[j] > arr[j+1] then",
        "      swap arr[j] and arr[j+1]",
        "  end for",
        "end for",
        "array is sorted",
    ]
)

FOREIGN_HINT = "The pseudocode says 'if A[i - 1] > A[i] then swap' - which highlighted value is larger?"
MATCHING_HINT = "The pseudocode checks arr[j] > arr[j+1] - which highlighted value is larger?"


def test_rejects_array_name_absent_from_pseudocode():
    assert uses_foreign_array_notation(FOREIGN_HINT, TAB_PSEUDOCODE)


def test_rejects_known_array_with_unknown_index_expression():
    assert uses_foreign_array_notation("What does arr[i-1] hold?", TAB_PSEUDOCODE)


def test_accepts_notation_quoted_from_pseudocode_ignoring_whitespace():
    assert not uses_foreign_array_notation(MATCHING_HINT, TAB_PSEUDOCODE)
    assert not uses_foreign_array_notation("Is arr[j + 1] smaller than arr[j]?", TAB_PSEUDOCODE)


def test_accepts_literal_index_on_known_array():
    assert not uses_foreign_array_notation("What value does arr[2] hold now?", TAB_PSEUDOCODE)


def test_ignores_plain_bracketed_lists_and_empty_text():
    assert not uses_foreign_array_notation("The array [5, 3, 1] becomes [3, 5, 1].", TAB_PSEUDOCODE)
    assert not uses_foreign_array_notation("", TAB_PSEUDOCODE)
    assert not uses_foreign_array_notation(None, TAB_PSEUDOCODE)


def _feedback(hint: str) -> dict:
    return {
        "consequence_explanation": "Leaving them in place keeps the larger value on the left.",
        "counterfactual_trace": "The array stays [5, 3, 1]. The 5 remains at index 0.",
        "socratic_hint": hint,
    }


def test_feedback_with_foreign_notation_is_invalid_when_pseudocode_given():
    assert not _feedback_is_valid(_feedback("Which is larger, A[i - 1] or A[i]?"), False, ScaffoldingLevel.LOW, None, TAB_PSEUDOCODE)
    assert _feedback_is_valid(_feedback("Which is larger, arr[j] or arr[j+1]?"), False, ScaffoldingLevel.LOW, None, TAB_PSEUDOCODE)


def _hint_request(pseudocode: str | None) -> HintRequest:
    return HintRequest(
        algorithm_name="Bubble Sort",
        step_index=3,
        current_prediction_prompt="The algorithm is comparing index 0 (value 5) and index 1 (value 3).",
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        pseudocode=pseudocode,
    )


def _stub_claude(monkeypatch, replies: list[str]) -> list[str]:
    prompts: list[str] = []

    async def fake_call(prompt: str, system: str | None = None) -> tuple[str, CallMetadata]:
        prompts.append(prompt)
        return replies[len(prompts) - 1], CallMetadata(latency_ms=1, input_tokens=1, output_tokens=1)

    monkeypatch.setattr(hints, "call_claude_for_text", fake_call)
    return prompts


def test_hint_with_foreign_notation_is_retried_and_retry_used(monkeypatch):
    prompts = _stub_claude(monkeypatch, [FOREIGN_HINT, MATCHING_HINT])
    response = asyncio.run(hints.request_hint(_hint_request(TAB_PSEUDOCODE)))
    assert len(prompts) == 2
    assert response.hint == MATCHING_HINT
    assert TAB_PSEUDOCODE in prompts[0]


def test_hint_falls_back_when_retry_also_uses_foreign_notation(monkeypatch):
    prompts = _stub_claude(monkeypatch, [FOREIGN_HINT, FOREIGN_HINT])
    response = asyncio.run(hints.request_hint(_hint_request(TAB_PSEUDOCODE)))
    assert len(prompts) == 2
    assert "A[i" not in response.hint
