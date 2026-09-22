"""First-hint quality (remediation doc Phase 12B.1).

Before this fix, a HIGH-scaffolding socratic_hint plugged in this step's
actual comparison values and ended with a yes/no question that itself
stated the correct choice (e.g. "...does that mean 8 should become the
root - yes or no?"), and em/en dashes slipped through unchanged despite
the project's global no-em-dash style rule applying to AI-generated copy
too."""

from models.request_models import ScaffoldingLevel
from routers.predictions import _collect_comparison_values, _feedback_is_valid, _hint_leaks_comparison_value
from services.claude_service import sanitize_dashes


def test_sanitize_dashes_replaces_em_and_en_dash_with_hyphen():
    assert sanitize_dashes("You chose no-swap—but 5 is greater than 3.") == "You chose no-swap - but 5 is greater than 3."
    assert sanitize_dashes("index 0–index 1") == "index 0 - index 1"


def test_sanitize_dashes_leaves_plain_hyphens_and_text_untouched():
    text = "This is a plain sentence with a hyphenated-word and no dashes."
    assert sanitize_dashes(text) == text


def test_collect_comparison_values_skips_indices_but_keeps_data_values():
    current_state = {
        "dataStructureState": [8, 2],
        "activeIndices": [0, 1],
        "criticalJunctionType": "SWAP_DECISION",
    }
    assert _collect_comparison_values(current_state) == {8, 2}


def test_collect_comparison_values_handles_nested_tree_state():
    current_state = {
        "dataStructureState": {"currentNode": None, "targetValue": 8, "insertionParentValue": None},
        "criticalJunctionType": "BST_DIRECTION",
    }
    assert _collect_comparison_values(current_state) == {8}


def test_hint_leaks_comparison_value_true_when_step_value_is_plugged_in():
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    hint = "Is 8 greater than 2, so should a swap happen - yes or no?"
    assert _hint_leaks_comparison_value(hint, current_state) is True


def test_hint_leaks_comparison_value_false_for_a_genuinely_abstract_hint():
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    hint = "Which of the two highlighted values is larger?"
    assert _hint_leaks_comparison_value(hint, current_state) is False


def test_collect_comparison_values_ignores_unrelated_array_elements():
    # Regression: the first implementation walked the entire array, so a
    # hint mentioning "2" for an unrelated reason (e.g. "compare these 2
    # values") false-positived against index 4's unrelated value of 2.
    current_state = {"dataStructureState": [5, 3, 1, 4, 2], "activeIndices": [0, 1]}
    assert _collect_comparison_values(current_state) == {5, 3}


def test_hint_leaks_comparison_value_ignores_unrelated_array_elements():
    current_state = {"dataStructureState": [5, 3, 1, 4, 2], "activeIndices": [0, 1]}
    hint = "Which of these 2 values is larger, and where should it end up?"
    assert _hint_leaks_comparison_value(hint, current_state) is False


def test_hint_leaks_comparison_value_ignores_index_numbers_alone():
    # Referencing "index 0" and "index 1" is fine on its own - those are
    # structural positions, not the values being compared.
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    hint = "Which value, the one at index 0 or index 1, is larger?"
    assert _hint_leaks_comparison_value(hint, current_state) is False


def test_feedback_is_valid_rejects_high_scaffolding_hint_that_leaks_a_value():
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    feedback = {
        "consequence_explanation": "You chose not to swap, but this leaves them out of order.",
        "socratic_hint": "Is 8 greater than 2, so should a swap happen - yes or no?",
        "counterfactual_trace": "If we skip this swap, the array stays [8, 2] and the 8 remains out of place.",
    }
    assert _feedback_is_valid(feedback, correct=False, scaffolding_level=ScaffoldingLevel.HIGH, current_state=current_state) is False


def test_feedback_is_valid_accepts_high_scaffolding_hint_without_leaked_values():
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    feedback = {
        "consequence_explanation": "You chose not to swap, but this leaves them out of order.",
        "socratic_hint": "Which of the two highlighted values is larger, and where should it end up?",
        "counterfactual_trace": "If we skip this swap, the array stays [8, 2] and the 8 remains out of place.",
    }
    assert _feedback_is_valid(feedback, correct=False, scaffolding_level=ScaffoldingLevel.HIGH, current_state=current_state) is True


def test_feedback_is_valid_does_not_apply_leak_check_below_high_scaffolding():
    # MEDIUM's socratic_hint is discarded by the client entirely (never
    # displayed), so the leak check is scoped to HIGH only - applying it
    # everywhere would force pointless retries for a field nobody sees.
    current_state = {"dataStructureState": [8, 2], "activeIndices": [0, 1]}
    feedback = {
        "consequence_explanation": "You chose not to swap, but this leaves them out of order.",
        "socratic_hint": "Is 8 greater than 2, so should a swap happen - yes or no?",
        "counterfactual_trace": "If we skip this swap, the array stays [8, 2] and the 8 remains out of place.",
    }
    assert _feedback_is_valid(feedback, correct=False, scaffolding_level=ScaffoldingLevel.MEDIUM, current_state=current_state) is True
