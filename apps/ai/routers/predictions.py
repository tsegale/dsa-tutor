from typing import Any

from fastapi import APIRouter

from models.request_models import PredictionRequest
from models.response_models import PredictionResponse
from prompts.registry import get_algorithm_context
from prompts.templates import FEEDBACK_TEMPLATE
from services.claude_service import call_claude_for_feedback
from services.fallback_service import get_fallback_prediction_response
from services.misconception_classifier import classify_bubble_sort_misconception

router = APIRouter()


def _evaluate_swap_decision(wrapper: dict, student_answer: str | None) -> bool:
    """SWAP_DECISION means different things depending on which algorithm
    produced it: Bubble Sort compares two adjacent array elements
    (dataStructureState is a plain list); Insertion Sort compares a key
    value against one element to its left (dataStructureState is an
    object with currentKey/compareIndex). Dispatch on that shape."""
    ds = wrapper.get("dataStructureState")

    if isinstance(ds, dict) and "currentKey" in ds:
        array = ds.get("array") or []
        compare_index = ds.get("compareIndex")
        key_val = ds.get("currentKey")
        if compare_index is None or compare_index < 0 or compare_index >= len(array):
            return False
        compare_val = array[compare_index]
        should_shift = key_val < compare_val
        if student_answer == "shift":
            return should_shift
        if student_answer == "stop":
            return not should_shift
        return False

    active = wrapper.get("activeIndices") or []
    arr = ds if isinstance(ds, list) else []
    if len(active) != 2 or not arr or max(active) >= len(arr):
        return False
    should_swap = arr[active[0]] > arr[active[1]]
    if student_answer == "swap":
        return should_swap
    if student_answer == "no-swap":
        return not should_swap
    return False


def _evaluate_target_check(ds: dict, student_answer: str | None) -> bool:
    arr = ds.get("array") or []
    idx = ds.get("currentIndex", 0)
    target = ds.get("target")
    is_match = 0 <= idx < len(arr) and arr[idx] == target
    if student_answer == "match":
        return is_match
    if student_answer == "no-match":
        return not is_match
    return False


def _evaluate_midpoint_decision(ds: dict, student_answer: str | None) -> bool:
    arr = ds.get("array") or []
    mid = ds.get("mid")
    target = ds.get("target")
    if mid is None or mid < 0 or mid >= len(arr):
        return False
    mid_val = arr[mid]
    if student_answer == "found":
        return mid_val == target
    if student_answer == "search-left":
        return target < mid_val
    if student_answer == "search-right":
        return target > mid_val
    return False


def _evaluate_new_minimum(ds: dict, student_answer: str | None) -> bool:
    arr = ds.get("array") or []
    scan_idx = ds.get("scanIndex", 0)
    min_idx = ds.get("currentMin", 0)
    if max(scan_idx, min_idx) >= len(arr) or min(scan_idx, min_idx) < 0:
        return False
    is_new_min = arr[scan_idx] < arr[min_idx]
    if student_answer == "update":
        return is_new_min
    if student_answer == "keep":
        return not is_new_min
    return False


def _evaluate_merge_decision(ds: dict, student_answer: str | None) -> bool:
    arr = ds.get("array") or []
    left_region = ds.get("leftRegion") or [0, 0]
    right_region = ds.get("rightRegion") or [0, 0]
    left_idx, right_idx = left_region[0], right_region[0]
    if not (0 <= left_idx < len(arr)) or not (0 <= right_idx < len(arr)):
        return False
    left_val, right_val = arr[left_idx], arr[right_idx]
    take_left_correct = left_val <= right_val
    if student_answer == "take-left":
        return take_left_correct
    if student_answer == "take-right":
        return not take_left_correct
    return False


def _evaluate_partition_decision(ds: dict, student_answer: str | None) -> bool:
    arr = ds.get("array") or []
    left_pointer = ds.get("leftPointer")
    pivot_val = ds.get("pivotValue")
    if left_pointer is None or not (0 <= left_pointer < len(arr)):
        return False
    should_swap = arr[left_pointer] < pivot_val
    if student_answer == "swap":
        return should_swap
    if student_answer == "skip":
        return not should_swap
    return False


def _evaluate_bst_direction(ds: dict, student_answer: str | None) -> bool:
    current_node = ds.get("currentNode")
    target = ds.get("targetValue")
    if current_node is None:
        return student_answer == "insert-here"
    current_val = current_node.get("value")
    # Standard convention: a value equal to the current node goes right.
    if target < current_val:
        return student_answer == "go-left"
    return student_answer == "go-right"


def _evaluate_next_node_selection(ds: dict, student_answer: str | None) -> bool:
    queue = ds.get("queue") or []
    if not queue:
        return False
    return student_answer == queue[0]


def evaluate_answer(request: PredictionRequest) -> bool:
    wrapper = request.current_state
    if not wrapper or not isinstance(wrapper, dict):
        return False

    junction_type = wrapper.get("criticalJunctionType")
    ds = wrapper.get("dataStructureState")

    # PASS_COMPLETE / EARLY_TERMINATION / ALGORITHM_COMPLETE are always
    # tile-based conceptual questions where the frontend uses tile id
    # 'correct' for the right answer, regardless of which algorithm
    # produced the junction.
    if junction_type in ("PASS_COMPLETE", "EARLY_TERMINATION", "ALGORITHM_COMPLETE"):
        return request.student_answer == "correct"

    if junction_type == "SWAP_DECISION":
        return _evaluate_swap_decision(wrapper, request.student_answer)

    if junction_type == "TARGET_CHECK":
        return _evaluate_target_check(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "MIDPOINT_DECISION":
        return _evaluate_midpoint_decision(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "NEW_MINIMUM":
        return _evaluate_new_minimum(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "MERGE_DECISION":
        return _evaluate_merge_decision(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "PARTITION_DECISION":
        return _evaluate_partition_decision(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "BST_DIRECTION":
        return _evaluate_bst_direction(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "NEXT_NODE_SELECTION":
        return _evaluate_next_node_selection(ds if isinstance(ds, dict) else {}, request.student_answer)

    return False


def build_comparison_context(junction_type: str, wrapper: dict, student_answer: str | None) -> str:
    """Names the exact values on screen so Claude's feedback is grounded
    in what the student actually saw, not generic. Only meaningful for
    the per-element decision junctions; conceptual junctions (PASS_
    COMPLETE etc.) are about an invariant, not a specific comparison."""
    ds = wrapper.get("dataStructureState")

    if junction_type == "SWAP_DECISION":
        if isinstance(ds, dict) and "currentKey" in ds:
            array = ds.get("array") or []
            compare_index = ds.get("compareIndex")
            key_val = ds.get("currentKey")
            if compare_index is None or compare_index < 0 or compare_index >= len(array):
                return ""
            compare_val = array[compare_index]
            should_shift = key_val < compare_val
            return (
                f"The key (value {key_val}) was compared with the element at index "
                f"{compare_index} (value {compare_val}). The correct action was "
                f'{"shift" if should_shift else "stop"} because {key_val} '
                f'{"<" if should_shift else ">="} {compare_val}. '
                f"The student chose: {student_answer}."
            )

        active = wrapper.get("activeIndices") or []
        arr = ds if isinstance(ds, list) else []
        if len(active) != 2 or not arr:
            return ""
        left_val = arr[active[0]]
        right_val = arr[active[1]]
        should_swap = left_val > right_val
        return (
            f"The algorithm compared index {active[0]} (value {left_val}) "
            f"with index {active[1]} (value {right_val}). "
            f'The correct action was {"swap" if should_swap else "no swap"} '
            f'because {left_val} {">" if should_swap else "<="} {right_val}. '
            f"The student chose: {student_answer}."
        )

    if junction_type == "TARGET_CHECK" and isinstance(ds, dict):
        arr = ds.get("array") or []
        idx = ds.get("currentIndex", 0)
        target = ds.get("target")
        val = arr[idx] if 0 <= idx < len(arr) else None
        return (
            f"The algorithm checked index {idx} (value {val}) against target {target}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "MIDPOINT_DECISION" and isinstance(ds, dict):
        arr = ds.get("array") or []
        mid = ds.get("mid")
        target = ds.get("target")
        mid_val = arr[mid] if mid is not None and 0 <= mid < len(arr) else None
        return (
            f"The midpoint was index {mid} (value {mid_val}), compared against target {target}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "NEW_MINIMUM" and isinstance(ds, dict):
        arr = ds.get("array") or []
        scan_idx = ds.get("scanIndex", 0)
        min_idx = ds.get("currentMin", 0)
        scan_val = arr[scan_idx] if 0 <= scan_idx < len(arr) else None
        min_val = arr[min_idx] if 0 <= min_idx < len(arr) else None
        return (
            f"Index {scan_idx} (value {scan_val}) was compared against the current "
            f"minimum at index {min_idx} (value {min_val}). "
            f"The student chose: {student_answer}."
        )

    if junction_type == "MERGE_DECISION" and isinstance(ds, dict):
        arr = ds.get("array") or []
        left_region = ds.get("leftRegion") or [0, 0]
        right_region = ds.get("rightRegion") or [0, 0]
        left_val = arr[left_region[0]] if 0 <= left_region[0] < len(arr) else None
        right_val = arr[right_region[0]] if 0 <= right_region[0] < len(arr) else None
        return (
            f"The left run's front value was {left_val} and the right run's front "
            f"value was {right_val}. The student chose: {student_answer}."
        )

    if junction_type == "PARTITION_DECISION" and isinstance(ds, dict):
        arr = ds.get("array") or []
        left_pointer = ds.get("leftPointer")
        pivot_val = ds.get("pivotValue")
        left_val = arr[left_pointer] if left_pointer is not None and 0 <= left_pointer < len(arr) else None
        return (
            f"The element at index {left_pointer} (value {left_val}) was compared "
            f"against the pivot (value {pivot_val}). The student chose: {student_answer}."
        )

    if junction_type == "BST_DIRECTION" and isinstance(ds, dict):
        current_node = ds.get("currentNode")
        target = ds.get("targetValue")
        current_val = current_node.get("value") if current_node else None
        return (
            f"The target value {target} was compared against "
            f"{'an empty position' if current_node is None else f'node value {current_val}'}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "NEXT_NODE_SELECTION" and isinstance(ds, dict):
        queue = ds.get("queue") or []
        return f"The current queue (front first) was {queue}. The student chose: {student_answer}."

    return ""


@router.post("/", response_model=PredictionResponse)
async def submit_prediction(request: PredictionRequest) -> PredictionResponse:
    correct = evaluate_answer(request)

    wrapper = request.current_state if isinstance(request.current_state, dict) else {}
    junction_type = wrapper.get("criticalJunctionType") or (
        request.junction_type.value if request.junction_type else "SWAP_DECISION"
    )
    junction_difficulty = request.junction_difficulty.value if request.junction_difficulty else "PROCEDURAL"
    comparison_context = build_comparison_context(junction_type, wrapper, request.student_answer)
    algorithm_context, pseudocode, junction_guidance_map = get_algorithm_context(request.algorithm_name)

    prompt = FEEDBACK_TEMPLATE.format(
        algorithm_context=algorithm_context,
        pseudocode=pseudocode,
        step_index=request.step_index,
        current_state=request.current_state,
        student_answer=request.student_answer,
        correct="correct" if correct else "incorrect",
        error_history=request.error_history,
        scaffolding_level=request.scaffolding_level.value,
        junction_type=junction_type,
        junction_difficulty=junction_difficulty,
        junction_guidance=junction_guidance_map.get(junction_type, ""),
        comparison_context=comparison_context,
    )

    try:
        feedback: dict[str, Any] = await call_claude_for_feedback(prompt)
        misconception = classify_bubble_sort_misconception(
            request.student_answer,
            request.current_state,
            feedback.get("misconception_category"),
        )
        return PredictionResponse(
            correct=correct,
            misconception_category=misconception,
            consequence_explanation=feedback["consequence_explanation"],
            socratic_hint=feedback["socratic_hint"],
            xp_awarded=feedback.get("xp_awarded", 10 if correct else 0),
            counterfactual_trace="" if correct else feedback.get("counterfactual_trace", ""),
        )
    except Exception:
        return get_fallback_prediction_response(correct)
