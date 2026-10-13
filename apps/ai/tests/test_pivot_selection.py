"""Quick Sort's PIVOT_SELECTION is a graded junction (Phase 7A): the tile
naming this implementation's rule (last element) is 'correct'; the other
pivot strategies are distractors."""

from models.request_models import PredictionRequest, ScaffoldingLevel
from routers.predictions import build_comparison_context, evaluate_answer
from services.fallback_service import get_fallback_prediction_response

STATE = {
    "criticalJunctionType": "PIVOT_SELECTION",
    "dataStructureState": {"array": [9, 4, 5, 7, 2], "partitionRange": [0, 4], "pivotIndex": 4, "pivotValue": 2},
}


def _request(student_answer: str) -> PredictionRequest:
    return PredictionRequest(
        algorithm_name="Quick Sort",
        step_index=1,
        current_state=STATE,
        student_answer=student_answer,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        session_id="test-session",
    )


def test_only_the_last_element_grades_correct():
    assert evaluate_answer(_request("correct")) is True
    for distractor in ("first-element", "median-of-three", "random"):
        assert evaluate_answer(_request(distractor)) is False


def test_context_names_the_range_and_the_rule():
    context = build_comparison_context("PIVOT_SELECTION", STATE, "first-element")
    assert "Indices 0 to 4" in context
    assert "last element of the range, index 4 (value 2)" in context


def test_fallback_hint_asks_about_the_rule_not_a_comparison():
    response = get_fallback_prediction_response(False, ScaffoldingLevel.HIGH, "Quick Sort", "PIVOT_SELECTION")
    assert "just compared" not in response.socratic_hint
