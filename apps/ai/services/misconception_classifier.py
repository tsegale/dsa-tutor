from typing import Any

from models.request_models import MisconceptionCategory


def _classify_swap_decision(student_answer: str, current_state: dict) -> MisconceptionCategory | None:
    active_indices = current_state.get("activeIndices") or []
    data = current_state.get("dataStructureState")

    if isinstance(data, dict) and "currentKey" in data:
        array = data.get("array") or []
        compare_index = data.get("compareIndex")
        key_val = data.get("currentKey")
        if compare_index is None or compare_index >= len(array):
            return None
        should_shift = key_val < array[compare_index]
        if should_shift and student_answer == "stop":
            return MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
        if not should_shift and student_answer == "shift":
            return MisconceptionCategory.ORDER_OF_OPERATIONS
        return None

    if len(active_indices) != 2 or not isinstance(data, list):
        return None
    left_index, right_index = active_indices[0], active_indices[1]
    if left_index >= len(data) or right_index >= len(data):
        return MisconceptionCategory.OFF_BY_ONE

    should_swap = data[left_index] > data[right_index]
    if should_swap and student_answer == "no-swap":
        return MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
    if not should_swap and student_answer == "swap":
        return MisconceptionCategory.ORDER_OF_OPERATIONS
    return None


def _classify_bst_direction(student_answer: str, ds: dict) -> MisconceptionCategory | None:
    current_node = ds.get("currentNode")
    target = ds.get("targetValue")
    if current_node is None:
        # Mirrors tileBuilder.ts's own tile ids for this empty-slot case -
        # see that file's comment on why this is never "insert-here".
        parent_value = ds.get("insertionParentValue")
        if parent_value is None:
            return None if student_answer == "becomes-root" else MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
        correct_side = "left" if target is not None and target < parent_value else "right"
        return None if student_answer == f"attach-{correct_side}" else MisconceptionCategory.COMPARISON_DIRECTION
    current_val = current_node.get("value")
    should_go_left = target is not None and current_val is not None and target < current_val
    if should_go_left and student_answer != "go-left":
        return MisconceptionCategory.COMPARISON_DIRECTION
    if not should_go_left and student_answer != "go-right":
        return MisconceptionCategory.COMPARISON_DIRECTION
    return None


def _classify_next_node_selection(student_answer: str, ds: dict) -> MisconceptionCategory | None:
    is_dfs = "discoveryTime" in ds
    frontier = ds.get("queue") if "queue" in ds else ds.get("frontier")
    frontier = frontier or []
    if not frontier:
        return None
    correct = frontier[-1] if is_dfs else frontier[0]
    if student_answer != correct and student_answer in frontier:
        return MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION
    return None


def _classify_visit_node(student_answer: str, ds: dict) -> MisconceptionCategory | None:
    correct = ds.get("nextVisitValue")
    if correct is None or student_answer == str(correct):
        return None
    return MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION


def _classify_trie(student_answer: str, ds: dict) -> MisconceptionCategory | None:
    if "charExists" in ds:
        char_exists = ds.get("charExists")
        if (student_answer == "exists") != char_exists:
            return MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
        return None
    if "needsNewNode" in ds:
        needs_new_node = ds.get("needsNewNode", False)
        if (student_answer == "new") != needs_new_node:
            return MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
        return None
    return None


def classify_misconception(
    student_answer: str | None,
    current_state: Any,
) -> MisconceptionCategory | None:
    """Rule-based fallback for free-text and code answers where no tile
    supplied a ground-truth label (see routers/predictions.py, which tries
    request.ground_truth_misconception first and only calls this when that
    is None). Used for all topics, not just Bubble Sort - dispatches on
    criticalJunctionType the same way routers/predictions.py's
    evaluate_answer does.

    This never takes the AI's own guess as an input: doing so let an
    unvalidated model label become the "ground truth" stored for the
    study's misconception-detection research question, which is exactly
    the defect this rule-based path exists to avoid (see remediation doc
    4.3). The AI's guess is surfaced separately as aiMisconceptionCategory."""
    if student_answer is None or not isinstance(current_state, dict):
        return None

    junction_type = current_state.get("criticalJunctionType")
    ds = current_state.get("dataStructureState")
    normalized = student_answer.strip().lower()

    if junction_type == "SWAP_DECISION" or junction_type is None:
        # None keeps the pre-4.x default (SWAP_DECISION) for callers that
        # never sent criticalJunctionType at all.
        return _classify_swap_decision(normalized, current_state)

    if junction_type == "BST_DIRECTION" and isinstance(ds, dict):
        return _classify_bst_direction(normalized, ds)

    if junction_type == "NEXT_NODE_SELECTION" and isinstance(ds, dict):
        return _classify_next_node_selection(student_answer, ds)

    if junction_type == "VISIT_NODE" and isinstance(ds, dict):
        return _classify_visit_node(student_answer, ds)

    if junction_type in ("TRIE_CHARACTER_MATCH", "TRIE_INSERT_NEW") and isinstance(ds, dict):
        return _classify_trie(normalized, ds)

    return None
