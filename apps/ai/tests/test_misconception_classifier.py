"""Ground-truth misconception labelling (remediation doc Phase 4).

Covers the specific defect the phase was written to fix: the stored label
used to be whatever the model emitted, unvalidated. These tests assert a
known wrong tile produces the expected ground-truth label, and that the
AI's own guess is resolved independently and never substituted in."""

from models.request_models import MisconceptionCategory, PredictionRequest, ScaffoldingLevel
from routers.predictions import resolve_ai_misconception, resolve_ground_truth_misconception
from services.misconception_classifier import classify_misconception


def _request(**overrides) -> PredictionRequest:
    defaults = dict(
        algorithm_name="Bubble Sort",
        step_index=0,
        current_state={
            "dataStructureState": [5, 3, 1, 4, 2],
            "activeIndices": [0, 1],
            "criticalJunctionType": "SWAP_DECISION",
        },
        student_answer="no-swap",
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        session_id="test-session",
        ground_truth_misconception=None,
    )
    defaults.update(overrides)
    return PredictionRequest(**defaults)


def test_known_wrong_tile_produces_its_authored_ground_truth_label():
    # This mirrors the SWAP_DECISION 'no-swap' tile in
    # PredictionZone.tsx, which is authored with
    # STRUCTURAL_PROPERTY_VIOLATION.
    request = _request(ground_truth_misconception=MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION)
    resolved = resolve_ground_truth_misconception(correct=False, request=request)
    assert resolved == MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION


def test_ai_label_is_stored_separately_and_never_overrides_ground_truth():
    request = _request(ground_truth_misconception=MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION)
    ground_truth = resolve_ground_truth_misconception(correct=False, request=request)
    ai_guess = resolve_ai_misconception(correct=False, feedback={"misconception_category": "ORDER_OF_OPERATIONS"})

    # The two disagree here on purpose - proves the AI's guess never
    # substitutes for the ground truth, so agreement between them is a
    # measurable, reportable quantity rather than an assumption.
    assert ground_truth == MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
    assert ai_guess == MisconceptionCategory.ORDER_OF_OPERATIONS
    assert ground_truth != ai_guess


def test_correct_answer_has_no_misconception_of_either_kind():
    request = _request(ground_truth_misconception=MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION)
    assert resolve_ground_truth_misconception(correct=True, request=request) is None
    assert resolve_ai_misconception(correct=True, feedback={"misconception_category": "OFF_BY_ONE"}) is None


def test_ai_misconception_falls_back_to_none_on_malformed_category():
    assert resolve_ai_misconception(correct=False, feedback={"misconception_category": "NOT_A_REAL_CATEGORY"}) is None
    assert resolve_ai_misconception(correct=False, feedback={}) is None


def test_rule_based_path_used_only_when_no_tile_supplied_ground_truth():
    # No ground_truth_misconception on the request (free-text/code answer,
    # or an older client) - falls back to the rule-based classifier.
    request = _request(ground_truth_misconception=None)
    resolved = resolve_ground_truth_misconception(correct=False, request=request)
    assert resolved == MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION


def test_rule_based_classifier_covers_bst_direction_not_just_two_index_arrays():
    # Target is less than the current node's value, so the correct move is
    # go-left; choosing go-right is a comparison-direction error. This is
    # the tree-shaped case the classifier used to silently return None for.
    current_state = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": {"value": 10}, "targetValue": 4},
    }
    assert classify_misconception("go-right", current_state) == MisconceptionCategory.COMPARISON_DIRECTION
    assert classify_misconception("go-left", current_state) is None


def test_rule_based_classifier_covers_bst_empty_slot_root_and_non_root():
    root_case = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 8, "insertionParentValue": None},
    }
    assert classify_misconception("becomes-root", root_case) is None
    assert classify_misconception("stays-empty", root_case) == MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION

    non_root_case = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 2, "insertionParentValue": 4},
    }
    assert classify_misconception("attach-left", non_root_case) is None
    assert classify_misconception("attach-right", non_root_case) == MisconceptionCategory.COMPARISON_DIRECTION


def test_rule_based_classifier_covers_trie_junctions():
    current_state = {
        "criticalJunctionType": "TRIE_CHARACTER_MATCH",
        "dataStructureState": {"currentChar": "a", "charExists": True},
    }
    assert classify_misconception("missing", current_state) == MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
    assert classify_misconception("exists", current_state) is None


def test_rule_based_classifier_covers_graph_traversal_order():
    current_state = {
        "criticalJunctionType": "NEXT_NODE_SELECTION",
        "dataStructureState": {"frontier": ["A", "B", "C"], "visited": []},
    }
    assert classify_misconception("B", current_state) == MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION
    assert classify_misconception("A", current_state) is None
