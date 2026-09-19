from models.request_models import ScaffoldingLevel
from services.fallback_service import get_fallback_hint, get_fallback_prediction_response


def test_fallback_is_not_bubble_sort_specific_for_other_algorithms():
    response = get_fallback_prediction_response(
        correct=False,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        algorithm_name="Heap Sort",
        junction_type="HEAP_COMPARE",
    )
    assert "bubble sort" not in response.socratic_hint.lower()
    assert "bubble sort" not in response.consequence_explanation.lower()
    assert "Heap Sort" in response.socratic_hint


def test_fallback_hint_respects_scaffolding_level():
    hints = {
        level: get_fallback_hint(level, "Merge Sort", "MERGE_DECISION").hint
        for level in ScaffoldingLevel
    }
    # Every level must produce a real, distinguishable question - not the
    # same hardcoded MEDIUM-level string regardless of what was requested.
    assert len(set(hints.values())) == len(ScaffoldingLevel)


def test_fallback_prediction_response_is_marked_not_ai_generated():
    response = get_fallback_prediction_response(
        correct=True,
        scaffolding_level=ScaffoldingLevel.HIGH,
        algorithm_name="Bubble Sort",
        junction_type="SWAP_DECISION",
    )
    assert response.ai_generated is False


def test_fallback_hint_is_marked_not_ai_generated():
    response = get_fallback_hint(ScaffoldingLevel.LOW, "Bubble Sort", "SWAP_DECISION")
    assert response.ai_generated is False


def test_correct_answer_never_gets_a_counterfactual_trace():
    response = get_fallback_prediction_response(
        correct=True,
        scaffolding_level=ScaffoldingLevel.NONE,
        algorithm_name="Quick Sort",
        junction_type="PARTITION_DECISION",
    )
    assert response.counterfactual_trace == ""


def test_incorrect_answer_gets_a_non_empty_counterfactual_trace():
    response = get_fallback_prediction_response(
        correct=False,
        scaffolding_level=ScaffoldingLevel.NONE,
        algorithm_name="Quick Sort",
        junction_type="PARTITION_DECISION",
    )
    assert response.counterfactual_trace != ""
    assert "Quick Sort" in response.counterfactual_trace
