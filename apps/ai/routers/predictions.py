import re
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


def _evaluate_gap_comparison(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    key_index = ds.get("keyIndex")
    compare_index = ds.get("compareIndex")
    if key_index is None or compare_index is None:
        return False
    if not (0 <= key_index < len(array)) or not (0 <= compare_index < len(array)):
        return False
    should_shift = array[key_index] < array[compare_index]
    if student_answer == "shift":
        return should_shift
    if student_answer == "no-shift":
        return not should_shift
    return False


def _evaluate_heap_compare(wrapper: dict, student_answer: str | None) -> bool:
    ds = wrapper.get("dataStructureState")
    active = wrapper.get("activeIndices") or []
    if not isinstance(ds, dict) or len(active) != 2:
        return False
    array = ds.get("array") or []
    parent, child = active[0], active[1]
    if max(parent, child) >= len(array) or min(parent, child) < 0:
        return False
    should_sift = array[child] > array[parent]
    if student_answer == "sift":
        return should_sift
    if student_answer == "stay":
        return not should_sift
    return False


def _evaluate_heap_extract(student_answer: str | None) -> bool:
    return student_answer == "extract"


def _evaluate_count_increment(ds: dict, student_answer: str | None) -> bool:
    input_arr = ds.get("input") or []
    idx = ds.get("currentInputIndex", -1)
    if idx < 0 or idx >= len(input_arr):
        return False
    return student_answer == str(input_arr[idx])


def _evaluate_prefix_accumulate(ds: dict, student_answer: str | None) -> bool:
    count = ds.get("count") or []
    i = ds.get("currentCountIndex", -1)
    if i <= 0 or i >= len(count):
        return False
    expected = count[i] + count[i - 1]
    return student_answer == str(expected)


def _evaluate_place_element(ds: dict, student_answer: str | None) -> bool:
    input_arr = ds.get("input") or []
    count = ds.get("count") or []
    idx = ds.get("currentInputIndex", -1)
    if idx < 0 or idx >= len(input_arr):
        return False
    val = input_arr[idx]
    if val < 0 or val >= len(count):
        return False
    expected_idx = count[val] - 1
    return student_answer == str(expected_idx)


def _evaluate_digit_bucket(ds: dict, student_answer: str | None) -> bool:
    return student_answer == str(ds.get("currentDigit", -1))


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
    # Shared by bfsEngine (queue), bfsNodeGraphEngine, and
    # dfsNodeGraphEngine (both use frontier) - DFS's frontier is a LIFO
    # stack (next = top / last), BFS's is FIFO (next = front / first).
    # discoveryTime is only ever populated by DFS, so its presence is
    # what tells the two frontier-shaped engines apart.
    is_dfs = "discoveryTime" in ds
    frontier = ds.get("queue") if "queue" in ds else ds.get("frontier")
    frontier = frontier or []
    if not frontier:
        return False
    correct = frontier[-1] if is_dfs else frontier[0]
    return student_answer == correct


def _evaluate_visit_node(ds: dict, student_answer: str | None) -> bool:
    correct = ds.get("nextVisitValue")
    if correct is None:
        return False
    return student_answer == str(correct)


def _evaluate_avl_balance_check(ds: dict, student_answer: str | None) -> bool:
    bf = ds.get("balanceFactor")
    if bf is None:
        return False
    is_balanced = -1 <= bf <= 1
    return student_answer == ("balanced" if is_balanced else "unbalanced")


def _evaluate_avl_rotation_type(ds: dict, student_answer: str | None) -> bool:
    return student_answer == ds.get("rotationType")


def _evaluate_rb_color_decision(ds: dict, student_answer: str | None) -> bool:
    uncle_color = ds.get("uncleColor")
    if uncle_color is None:
        return False
    return (student_answer == "recolor") == (uncle_color == "RED")


def _evaluate_rb_rotation_recolor(ds: dict, student_answer: str | None) -> bool:
    return student_answer == ds.get("fixupOperation")


def _evaluate_heap_sift_up(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    curr = ds.get("currentIdx")
    parent = ds.get("parentIdx")
    if curr is None or parent is None or curr >= len(array) or parent >= len(array):
        return False
    heap_type = ds.get("heapType")
    should_swap = array[curr] > array[parent] if heap_type == "max" else array[curr] < array[parent]
    if student_answer == "swap":
        return should_swap
    if student_answer == "stay":
        return not should_swap
    return False


def _evaluate_trie_character_match(ds: dict, student_answer: str | None) -> bool:
    char_exists = ds.get("charExists")
    if char_exists is None:
        return False
    return (student_answer == "exists") == char_exists


def _evaluate_trie_insert_new(ds: dict, student_answer: str | None) -> bool:
    needs_new_node = ds.get("needsNewNode", False)
    return (student_answer == "new") == needs_new_node


# --- Graphs track --------------------------------------------------


def _evaluate_edge_relax(ds: dict, student_answer: str | None) -> bool:
    # currentDist is JS Infinity for an unvisited node, which JSON.stringify
    # serializes as null - it round-trips here as None, not a missing value.
    current_dist = ds.get("currentDist")
    new_dist = ds.get("newDist")
    if new_dist is None:
        return False
    should_relax = current_dist is None or new_dist < current_dist
    if student_answer == "relax":
        return should_relax
    if student_answer == "skip":
        return not should_relax
    return False


def _evaluate_bellman_pass_complete(ds: dict, student_answer: str | None) -> bool:
    any_changed = ds.get("anyChanged")
    if any_changed is None:
        return False
    if student_answer == "continue":
        return any_changed
    if student_answer == "done":
        return not any_changed
    return False


def _evaluate_matrix_update(ds: dict, student_answer: str | None) -> bool:
    i, j, k = ds.get("i"), ds.get("j"), ds.get("k")
    dist = ds.get("dist")
    if i is None or j is None or k is None or dist is None:
        return False

    # Unreachable pairs are JS Infinity, which JSON.stringify serializes as
    # null - it round-trips here as None.
    def cell(r: int, c: int) -> float:
        v = dist[r][c]
        return float("inf") if v is None else v

    through_k = cell(i, k) + cell(k, j)
    improves = through_k < cell(i, j)
    if student_answer == "update":
        return improves
    if student_answer == "keep":
        return not improves
    return False


def _evaluate_union_find_check(ds: dict, student_answer: str | None) -> bool:
    same_component = ds.get("sameComponent")
    if same_component is None:
        return False
    if student_answer == "add":
        return not same_component
    if student_answer == "skip":
        return same_component
    return False


def _evaluate_mst_edge_select(ds: dict, student_answer: str | None) -> bool:
    candidates = ds.get("candidateEdges") or []
    if not candidates:
        return False
    # candidateEdges is already sorted ascending by weight (see prim.ts) -
    # the first entry is always the minimum.
    from_node, to_node, _weight = candidates[0]
    return student_answer == f"{from_node}-{to_node}"


def _evaluate_cycle_found(ds: dict, student_answer: str | None) -> bool:
    is_back_edge = ds.get("isBackEdge")
    if is_back_edge is None:
        return False
    if student_answer == "cycle":
        return is_back_edge
    if student_answer == "no-cycle":
        return not is_back_edge
    return False


def _evaluate_new_component(ds: dict, student_answer: str | None) -> bool:
    total = ds.get("totalComponents")
    if total is None:
        return False
    return student_answer == str(total)


def _evaluate_topological_order(ds: dict, student_answer: str | None) -> bool:
    current_node = ds.get("currentNode")
    if not current_node:
        return False
    return student_answer == current_node


def _evaluate_grid_next_cell(ds: dict, student_answer: str | None) -> bool:
    frontier = ds.get("frontierCells") or []
    grid = ds.get("grid")
    if not frontier or not grid:
        return False
    is_astar = ds.get("algorithmType") == "astar"

    def priority(cell: list[int]) -> float:
        r, c = cell
        info = grid[r][c] if r < len(grid) and c < len(grid[r]) else {}
        g = info.get("gScore", 0) or 0
        h = info.get("hScore", 0) or 0
        return g + h if is_astar else g

    best = min(frontier, key=priority)
    return student_answer == f"{best[0]},{best[1]}"


def _evaluate_heap_sift_down(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    curr = ds.get("currentIdx")
    left = ds.get("leftChildIdx")
    right = ds.get("rightChildIdx")
    if curr is None or curr >= len(array):
        return False
    heap_type = ds.get("heapType")

    def has_priority(a: int, b: int) -> bool:
        return array[a] > array[b] if heap_type == "max" else array[a] < array[b]

    target = curr
    if left is not None and left < len(array) and has_priority(left, target):
        target = left
    if right is not None and right < len(array) and has_priority(right, target):
        target = right

    expected = "stay" if target == curr else ("left" if target == left else "right")
    return student_answer == expected


# --- Foundations track ------------------------------------------------
# Every helper below mirrors the tile `id` convention the frontend uses
# in getTilesForSnapshot (apps/web/src/components/prediction/
# PredictionZone.tsx) exactly - the two sides never share code, so they
# must agree on the same id strings by construction.


def _evaluate_index_access(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"idx-{ds.get('targetIndex')}"


def _evaluate_insert_position(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"idx-{ds.get('targetIndex', 0) + 2}"


def _evaluate_delete_shift(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    pos = ds.get("targetIndex", 0)
    if pos < len(array):
        return student_answer == f"idx-{pos}"
    return student_answer == "end-of-array"


def _evaluate_null_check(ds: dict, student_answer: str | None) -> bool:
    nodes = ds.get("nodes") or []
    if ds.get("operation") == "traverse":
        return student_answer == "when-head-again"
    current_id = ds.get("currentId")
    current = next((n for n in nodes if n.get("id") == current_id), None)
    if current is not None:
        # Mid-traversal "is this the last node?" - true only when this
        # existing node's own .next is null.
        return student_answer == ("yes-last" if current.get("next") is None else "no-more")
    # About to create a brand-new node: what will its .next point to?
    return student_answer == ("current-head" if ds.get("headId") else "null")


def _is_dll(ds: dict) -> bool:
    nodes = ds.get("nodes") or []
    return any("prev" in n for n in nodes)


def _evaluate_insert_between(ds: dict, student_answer: str | None) -> bool:
    if _is_dll(ds):
        return student_answer == "all-four"
    return student_answer == "new-then-prev"


def _evaluate_delete_relink(ds: dict, student_answer: str | None) -> bool:
    if _is_dll(ds):
        return student_answer == "two"
    return student_answer == "prev-next-eq-x-next"


def _evaluate_pointer_follow(ds: dict, student_answer: str | None) -> bool:
    nodes = ds.get("nodes") or []
    current = next((n for n in nodes if n.get("id") == ds.get("currentId")), None)
    if current is None:
        return False
    if ds.get("operation") == "reverse":
        return student_answer == "the-previous-node"
    active_pointer = ds.get("activePointer") or "next"
    target_id = current.get(active_pointer)
    return student_answer == (target_id if target_id is not None else "null")


def _evaluate_wrap_check(student_answer: str | None) -> bool:
    return student_answer == "the-head-node"


def _evaluate_stack_push_result(student_answer: str | None) -> bool:
    return student_answer == "pushed-value"


def _evaluate_stack_pop_result(student_answer: str | None) -> bool:
    return student_answer == "top-value"


def _evaluate_overflow_check(student_answer: str | None) -> bool:
    return student_answer == "no-overflow"


def _evaluate_underflow_check(student_answer: str | None) -> bool:
    return student_answer == "error-underflow"


def _evaluate_queue_rear(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"idx-{ds.get('rearIndex')}"


def _evaluate_queue_front(student_answer: str | None) -> bool:
    return student_answer == "front-value"


def _evaluate_circular_wrap(student_answer: str | None) -> bool:
    # circularQueueEngine always wraps the rear back to index 0.
    return student_answer == "idx-0"


def _evaluate_deque_end(ds: dict, student_answer: str | None, description: str) -> bool:
    is_front = "front" in description.lower()
    return student_answer == ("front" if is_front else "back")


def _evaluate_load_factor(ds: dict, student_answer: str | None) -> bool:
    if "frontIndex" in ds:
        return student_answer == f"wasted-{ds.get('frontIndex')}"
    return student_answer == "yes-too-high"


def _evaluate_hash_bucket(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"bucket-{ds.get('hashResult')}"


def _evaluate_collision_resolve(student_answer: str | None) -> bool:
    return student_answer == "back-of-chain"


def _evaluate_probe_next(student_answer: str | None) -> bool:
    return student_answer == "i-plus-1-mod"


def _evaluate_jump_size(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"size-{ds.get('jumpSize')}"


def _evaluate_probe_position(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"idx-{ds.get('probedIndex')}"


def _evaluate_range_double(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    bound = ds.get("bound")
    target = ds.get("target")
    if bound is None or not (0 <= bound < len(array)):
        return False
    too_small = array[bound] < target
    if student_answer == "yes-too-small":
        return too_small
    if student_answer == "no-large-enough":
        return not too_small
    return False


def _evaluate_base_case(student_answer: str | None) -> bool:
    # factorial(0) and fib(1) both return 1.
    return student_answer == "one"


def _evaluate_return_value(student_answer: str | None, description: str) -> bool:
    n_match = re.search(r"factorial\((\d+)\)", description)
    prev_match = re.search(r"returned (\d+)", description)
    if not n_match or not prev_match:
        return False
    n, prev = int(n_match.group(1)), int(prev_match.group(1))
    return student_answer == f"mult-{n * prev}"


def _evaluate_recursive_call(ds: dict, student_answer: str | None) -> bool:
    frames = ds.get("frames") or []
    if "totalCalls" in ds:
        n = max((f.get("argument", 0) for f in frames), default=1)
        return student_answer == f"exp-{2 ** n}"
    remaining = min((f.get("argument", 0) for f in frames), default=0)
    return student_answer == f"remaining-{remaining}"


def _evaluate_pointer_move(ds: dict, student_answer: str | None) -> bool:
    array = ds.get("array") or []
    left = ds.get("leftPointerIndex", 0)
    right = ds.get("rightPointerIndex", 0)
    if ds.get("target") is not None:
        if not (0 <= left < len(array)) or not (0 <= right < len(array)):
            return False
        total = array[left] + array[right]
        target = ds["target"]
        if student_answer == "move-left":
            return total < target
        if student_answer == "move-right":
            return total > target
        return False
    if not (0 <= left < len(array)) or not (0 <= right < len(array)):
        return False
    matches = array[left] == array[right]
    if student_answer == "match-inward":
        return matches
    if student_answer == "no-match":
        return not matches
    return False


def _evaluate_window_sum(ds: dict, student_answer: str | None) -> bool:
    return student_answer == f"sum-{ds.get('windowSum')}"


def _evaluate_window_expand(ds: dict, student_answer: str | None) -> bool:
    target_sum = ds.get("targetSum")
    window_sum = ds.get("windowSum", 0)
    if target_sum is not None:
        if student_answer == "expand":
            return window_sum < target_sum
        if student_answer == "shrink":
            return window_sum >= target_sum
        return False
    array = ds.get("array") or []
    window_start = ds.get("windowStart", 0)
    window_end = ds.get("windowEnd", -1)
    if not (0 <= window_start < len(array)) or not (0 <= window_end + 1 < len(array)):
        return False
    new_sum = window_sum - array[window_start] + array[window_end + 1]
    return student_answer == f"sum-{new_sum}"


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

    if junction_type == "GAP_COMPARISON":
        return _evaluate_gap_comparison(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "HEAP_COMPARE":
        return _evaluate_heap_compare(wrapper, request.student_answer)

    if junction_type == "HEAP_EXTRACT":
        return _evaluate_heap_extract(request.student_answer)

    if junction_type == "COUNT_INCREMENT":
        return _evaluate_count_increment(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "PREFIX_ACCUMULATE":
        return _evaluate_prefix_accumulate(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "PLACE_ELEMENT":
        return _evaluate_place_element(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "DIGIT_BUCKET":
        return _evaluate_digit_bucket(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "BST_DIRECTION":
        return _evaluate_bst_direction(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "NEXT_NODE_SELECTION":
        return _evaluate_next_node_selection(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "VISIT_NODE":
        return _evaluate_visit_node(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "AVL_BALANCE_CHECK":
        return _evaluate_avl_balance_check(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "AVL_ROTATION_TYPE":
        return _evaluate_avl_rotation_type(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "RB_COLOR_DECISION":
        return _evaluate_rb_color_decision(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "RB_ROTATION_RECOLOR":
        return _evaluate_rb_rotation_recolor(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "HEAP_SIFT_UP":
        return _evaluate_heap_sift_up(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "HEAP_SIFT_DOWN":
        return _evaluate_heap_sift_down(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "TRIE_CHARACTER_MATCH":
        return _evaluate_trie_character_match(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "TRIE_INSERT_NEW":
        return _evaluate_trie_insert_new(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "EDGE_RELAX":
        return _evaluate_edge_relax(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "BELLMAN_PASS_COMPLETE":
        return _evaluate_bellman_pass_complete(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "MATRIX_UPDATE":
        return _evaluate_matrix_update(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "UNION_FIND_CHECK":
        return _evaluate_union_find_check(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "MST_EDGE_SELECT":
        return _evaluate_mst_edge_select(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "CYCLE_FOUND":
        return _evaluate_cycle_found(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "NEW_COMPONENT":
        return _evaluate_new_component(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "TOPOLOGICAL_ORDER":
        return _evaluate_topological_order(ds if isinstance(ds, dict) else {}, request.student_answer)

    if junction_type == "GRID_NEXT_CELL":
        return _evaluate_grid_next_cell(ds if isinstance(ds, dict) else {}, request.student_answer)

    # Foundations track
    ds_dict = ds if isinstance(ds, dict) else {}
    description = wrapper.get("description") or ""

    if junction_type == "INDEX_ACCESS":
        return _evaluate_index_access(ds_dict, request.student_answer)
    if junction_type == "INSERT_POSITION":
        return _evaluate_insert_position(ds_dict, request.student_answer)
    if junction_type == "DELETE_SHIFT":
        return _evaluate_delete_shift(ds_dict, request.student_answer)
    if junction_type == "NULL_CHECK":
        return _evaluate_null_check(ds_dict, request.student_answer)
    if junction_type == "INSERT_BETWEEN":
        return _evaluate_insert_between(ds_dict, request.student_answer)
    if junction_type == "DELETE_RELINK":
        return _evaluate_delete_relink(ds_dict, request.student_answer)
    if junction_type in ("POINTER_FOLLOW", "TRAVERSE_DIRECTION"):
        return _evaluate_pointer_follow(ds_dict, request.student_answer)
    if junction_type == "WRAP_CHECK":
        return _evaluate_wrap_check(request.student_answer)
    if junction_type == "STACK_PUSH_RESULT":
        return _evaluate_stack_push_result(request.student_answer)
    if junction_type == "STACK_POP_RESULT":
        return _evaluate_stack_pop_result(request.student_answer)
    if junction_type == "OVERFLOW_CHECK":
        return _evaluate_overflow_check(request.student_answer)
    if junction_type == "UNDERFLOW_CHECK":
        return _evaluate_underflow_check(request.student_answer)
    if junction_type == "QUEUE_REAR":
        return _evaluate_queue_rear(ds_dict, request.student_answer)
    if junction_type == "QUEUE_FRONT":
        return _evaluate_queue_front(request.student_answer)
    if junction_type == "CIRCULAR_WRAP":
        return _evaluate_circular_wrap(request.student_answer)
    if junction_type == "DEQUE_END":
        return _evaluate_deque_end(ds_dict, request.student_answer, description)
    if junction_type == "LOAD_FACTOR":
        return _evaluate_load_factor(ds_dict, request.student_answer)
    if junction_type == "HASH_BUCKET":
        return _evaluate_hash_bucket(ds_dict, request.student_answer)
    if junction_type == "COLLISION_RESOLVE":
        return _evaluate_collision_resolve(request.student_answer)
    if junction_type == "PROBE_NEXT":
        return _evaluate_probe_next(request.student_answer)
    if junction_type == "JUMP_SIZE":
        return _evaluate_jump_size(ds_dict, request.student_answer)
    if junction_type == "PROBE_POSITION":
        return _evaluate_probe_position(ds_dict, request.student_answer)
    if junction_type == "RANGE_DOUBLE":
        return _evaluate_range_double(ds_dict, request.student_answer)
    if junction_type == "BASE_CASE":
        return _evaluate_base_case(request.student_answer)
    if junction_type == "RETURN_VALUE":
        return _evaluate_return_value(request.student_answer, description)
    if junction_type == "RECURSIVE_CALL":
        return _evaluate_recursive_call(ds_dict, request.student_answer)
    if junction_type == "POINTER_MOVE":
        return _evaluate_pointer_move(ds_dict, request.student_answer)
    if junction_type == "WINDOW_SUM":
        return _evaluate_window_sum(ds_dict, request.student_answer)
    if junction_type == "WINDOW_EXPAND":
        return _evaluate_window_expand(ds_dict, request.student_answer)

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
        is_dfs = "discoveryTime" in ds
        frontier = (ds.get("queue") if "queue" in ds else ds.get("frontier")) or []
        shape = "stack, top first" if is_dfs else "queue, front first"
        return f"The current {shape} was {frontier}. The student chose: {student_answer}."

    if junction_type == "AVL_BALANCE_CHECK" and isinstance(ds, dict):
        node_value = (ds.get("currentNode") or {}).get("value")
        return (
            f"Node {node_value} has balance factor {ds.get('balanceFactor')} "
            f"(height(left) - height(right)). Balanced means the value is -1, 0, or 1. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "AVL_ROTATION_TYPE" and isinstance(ds, dict):
        node_value = (ds.get("currentNode") or {}).get("value")
        return (
            f"Node {node_value} is unbalanced (balance factor {ds.get('balanceFactor')}); "
            f"the correct fix is a {ds.get('rotationType')} rotation. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "RB_COLOR_DECISION" and isinstance(ds, dict):
        node_value = (ds.get("currentNode") or {}).get("value")
        return (
            f"Node {node_value} has a Red-Black violation. The relevant uncle/sibling "
            f"node's colour is {ds.get('uncleColor')}. Uncle RED means Case 1 (recolour "
            f"only); uncle BLACK means a rotation is needed. The student chose: {student_answer}."
        )

    if junction_type == "RB_ROTATION_RECOLOR" and isinstance(ds, dict):
        node_value = (ds.get("currentNode") or {}).get("value")
        return (
            f"Node {node_value}'s violation is resolved by: {ds.get('fixupOperation')}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "HEAP_SIFT_UP" and isinstance(ds, dict):
        array = ds.get("array") or []
        curr, parent = ds.get("currentIdx"), ds.get("parentIdx")
        curr_val = array[curr] if curr is not None and curr < len(array) else None
        parent_val = array[parent] if parent is not None and parent < len(array) else None
        return (
            f"Comparing {curr_val} (index {curr}) with its parent {parent_val} (index {parent}) "
            f"in a {ds.get('heapType')}-heap. The student chose: {student_answer}."
        )

    if junction_type == "HEAP_SIFT_DOWN" and isinstance(ds, dict):
        array = ds.get("array") or []
        curr = ds.get("currentIdx")
        curr_val = array[curr] if curr is not None and curr < len(array) else None
        return (
            f"At index {curr} (value {curr_val}) in a {ds.get('heapType')}-heap, checking both "
            f"children for a heap-property violation. The student chose: {student_answer}."
        )

    if junction_type == "TRIE_CHARACTER_MATCH" and isinstance(ds, dict):
        return (
            f"Examining character '{ds.get('currentChar')}' while processing \"{ds.get('currentWord')}\". "
            f"It {'exists' if ds.get('charExists') else 'does not exist'} as a child of the current node. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "TRIE_INSERT_NEW" and isinstance(ds, dict):
        return (
            f"Examining character '{ds.get('currentChar')}' while inserting \"{ds.get('currentWord')}\". "
            f"A new node {'is' if ds.get('needsNewNode') else 'is not'} needed. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "VISIT_NODE" and isinstance(ds, dict):
        visited = ds.get("visitedOrder") or []
        traversal_type = ds.get("traversalType")
        next_val = ds.get("nextVisitValue")
        return (
            f"This is a {traversal_type} traversal. Nodes visited so far: {visited}. "
            f"The correct next value to visit is {next_val}. The student chose: {student_answer}."
        )

    if junction_type == "EDGE_RELAX" and isinstance(ds, dict):
        current_dist = ds.get("currentDist")
        new_dist = ds.get("newDist")
        current_dist_label = "infinity (unvisited)" if current_dist is None else current_dist
        return (
            f"Relaxing edge {ds.get('relaxFrom')} -> {ds.get('relaxTo')} (weight {ds.get('relaxWeight')}). "
            f"Current known distance to {ds.get('relaxTo')} is {current_dist_label}, the path through "
            f"{ds.get('relaxFrom')} would give {new_dist}. The student chose: {student_answer}."
        )

    if junction_type == "BELLMAN_PASS_COMPLETE" and isinstance(ds, dict):
        return (
            f"Pass {ds.get('passNumber')} of {ds.get('totalPasses')} finished. "
            f"{'A distance changed' if ds.get('anyChanged') else 'No distance changed'} during this pass. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "MATRIX_UPDATE" and isinstance(ds, dict):
        i, j, k = ds.get("i"), ds.get("j"), ds.get("k")
        dist = ds.get("dist") or []
        node_ids = ds.get("nodeIds") or []
        return (
            f"Checking whether going through {node_ids[k] if k is not None and k < len(node_ids) else k} "
            f"shortens the path from {node_ids[i] if i is not None and i < len(node_ids) else i} to "
            f"{node_ids[j] if j is not None and j < len(node_ids) else j}: "
            f"dist[{i}][{k}] + dist[{k}][{j}] vs dist[{i}][{j}]. The student chose: {student_answer}."
        )

    if junction_type == "UNION_FIND_CHECK" and isinstance(ds, dict):
        return (
            f"Considering edge {ds.get('fromNode')} - {ds.get('toNode')} (weight {ds.get('weight')}). "
            f"The endpoints are {'in the same component' if ds.get('sameComponent') else 'in different components'}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "MST_EDGE_SELECT" and isinstance(ds, dict):
        candidates = ds.get("candidateEdges") or []
        return (
            f"Candidate edges from the current frontier: {candidates}. "
            f"The cheapest one should be added to the MST. The student chose: {student_answer}."
        )

    if junction_type == "CYCLE_FOUND" and isinstance(ds, dict):
        return (
            f"Examining an edge during DFS where the destination is already visited. "
            f"{'This is a back edge, so a cycle exists' if ds.get('isBackEdge') else 'This is not a back edge, so no cycle here'}. "
            f"The student chose: {student_answer}."
        )

    if junction_type == "NEW_COMPONENT" and isinstance(ds, dict):
        return (
            f"Restarting the search from an unvisited node. The graph has "
            f"{ds.get('totalComponents')} connected components in total. The student chose: {student_answer}."
        )

    if junction_type == "TOPOLOGICAL_ORDER" and isinstance(ds, dict):
        return (
            f"Node {ds.get('currentNode')} has finished processing all its neighbours and is "
            f"about to be placed at the front of the topological order. The student chose: {student_answer}."
        )

    if junction_type == "GRID_NEXT_CELL" and isinstance(ds, dict):
        frontier = ds.get("frontierCells") or []
        return (
            f"The current frontier cells are {frontier}. The algorithm ({ds.get('algorithmType')}) "
            f"picks the one with the lowest priority score next. The student chose: {student_answer}."
        )

    return ""


@router.post("/", response_model=PredictionResponse)
async def submit_prediction(request: PredictionRequest) -> PredictionResponse:
    correct = evaluate_answer(request)

    wrapper = request.current_state if isinstance(request.current_state, dict) else {}
    junction_type = wrapper.get("criticalJunctionType") or request.junction_type or "SWAP_DECISION"
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
