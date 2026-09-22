"""Tied-optimal answers must all grade correct (remediation doc Phase 5).

Before this fix, `_evaluate_mst_edge_select` and `_evaluate_grid_next_cell`
accepted only whichever tied candidate happened to sort or iterate first,
marking an equally valid choice wrong. `_evaluate_heap_sift_down` had the
same defect when both children tie on priority."""

from models.request_models import PredictionRequest, ScaffoldingLevel
from routers.predictions import evaluate_answer


def _request(current_state: dict, student_answer: str) -> PredictionRequest:
    return PredictionRequest(
        algorithm_name="test",
        step_index=0,
        current_state=current_state,
        student_answer=student_answer,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        session_id="test-session",
    )


def test_mst_edge_select_accepts_either_tied_minimum_weight_edge():
    current_state = {
        "criticalJunctionType": "MST_EDGE_SELECT",
        "dataStructureState": {"candidateEdges": [["A", "B", 3], ["C", "D", 3], ["E", "F", 5]]},
    }
    assert evaluate_answer(_request(current_state, "A-B")) is True
    assert evaluate_answer(_request(current_state, "C-D")) is True
    assert evaluate_answer(_request(current_state, "E-F")) is False


def test_mst_edge_select_still_rejects_non_minimum_when_no_tie():
    current_state = {
        "criticalJunctionType": "MST_EDGE_SELECT",
        "dataStructureState": {"candidateEdges": [["A", "B", 2], ["C", "D", 5]]},
    }
    assert evaluate_answer(_request(current_state, "A-B")) is True
    assert evaluate_answer(_request(current_state, "C-D")) is False


def _grid(cells: dict[tuple[int, int], dict]) -> list[list[dict]]:
    max_r = max(r for r, _c in cells) + 1
    max_c = max(c for _r, c in cells) + 1
    grid = [[{} for _ in range(max_c)] for _ in range(max_r)]
    for (r, c), info in cells.items():
        grid[r][c] = info
    return grid


def test_grid_next_cell_accepts_either_tied_lowest_priority_cell():
    current_state = {
        "criticalJunctionType": "GRID_NEXT_CELL",
        "dataStructureState": {
            "algorithmType": "bfs",
            "frontierCells": [[0, 0], [1, 1], [2, 2]],
            "grid": _grid({(0, 0): {"gScore": 4}, (1, 1): {"gScore": 4}, (2, 2): {"gScore": 9}}),
        },
    }
    assert evaluate_answer(_request(current_state, "0,0")) is True
    assert evaluate_answer(_request(current_state, "1,1")) is True
    assert evaluate_answer(_request(current_state, "2,2")) is False


def test_grid_next_cell_astar_uses_g_plus_h_for_ties():
    current_state = {
        "criticalJunctionType": "GRID_NEXT_CELL",
        "dataStructureState": {
            "algorithmType": "astar",
            "frontierCells": [[0, 0], [1, 1]],
            "grid": _grid({(0, 0): {"gScore": 2, "hScore": 3}, (1, 1): {"gScore": 4, "hScore": 1}}),
        },
    }
    # Both f(n) = 5 - tied even though g and h individually differ.
    assert evaluate_answer(_request(current_state, "0,0")) is True
    assert evaluate_answer(_request(current_state, "1,1")) is True


def test_heap_sift_down_accepts_either_child_when_priorities_tie():
    current_state = {
        "criticalJunctionType": "HEAP_SIFT_DOWN",
        "dataStructureState": {
            "array": [1, 9, 9],
            "currentIdx": 0,
            "leftChildIdx": 1,
            "rightChildIdx": 2,
            "heapType": "max",
        },
    }
    assert evaluate_answer(_request(current_state, "left")) is True
    assert evaluate_answer(_request(current_state, "right")) is True
    assert evaluate_answer(_request(current_state, "stay")) is False


def test_heap_sift_down_still_picks_single_winner_when_not_tied():
    current_state = {
        "criticalJunctionType": "HEAP_SIFT_DOWN",
        "dataStructureState": {
            "array": [1, 5, 9],
            "currentIdx": 0,
            "leftChildIdx": 1,
            "rightChildIdx": 2,
            "heapType": "max",
        },
    }
    assert evaluate_answer(_request(current_state, "right")) is True
    assert evaluate_answer(_request(current_state, "left")) is False


def test_bst_direction_equal_value_goes_right_by_stated_convention():
    current_state = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": {"value": 7}, "targetValue": 7},
    }
    assert evaluate_answer(_request(current_state, "go-right")) is True
    assert evaluate_answer(_request(current_state, "go-left")) is False


def test_bst_direction_root_insertion_accepts_becomes_root():
    # Reached the empty slot with no parent at all (first insertion into an
    # empty tree) - there is nothing to compare against, so the only
    # sensible answer is "it becomes the root" (remediation doc Phase 12A.1).
    current_state = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 8, "insertionParentValue": None},
    }
    assert evaluate_answer(_request(current_state, "becomes-root")) is True
    assert evaluate_answer(_request(current_state, "stays-empty")) is False
    assert evaluate_answer(_request(current_state, "needs-comparison")) is False


def test_bst_direction_non_root_empty_slot_names_the_correct_side_of_the_parent():
    current_state = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 2, "insertionParentValue": 4},
    }
    assert evaluate_answer(_request(current_state, "attach-left")) is True
    assert evaluate_answer(_request(current_state, "attach-right")) is False

    current_state_right = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 6, "insertionParentValue": 4},
    }
    assert evaluate_answer(_request(current_state_right, "attach-right")) is True
    assert evaluate_answer(_request(current_state_right, "attach-left")) is False


def test_bst_direction_non_root_empty_slot_equal_value_attaches_right():
    # Same "equal goes right" convention as the node-to-node comparison above.
    current_state = {
        "criticalJunctionType": "BST_DIRECTION",
        "dataStructureState": {"currentNode": None, "targetValue": 4, "insertionParentValue": 4},
    }
    assert evaluate_answer(_request(current_state, "attach-right")) is True
    assert evaluate_answer(_request(current_state, "attach-left")) is False
