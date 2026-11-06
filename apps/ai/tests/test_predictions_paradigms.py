from models.request_models import PredictionRequest, ScaffoldingLevel
from routers.predictions import evaluate_answer


def _req(junction_type: str, ds: object, answer: str, description: str = "") -> PredictionRequest:
    return PredictionRequest(
        algorithm_name="test",
        step_index=1,
        current_state={
            "criticalJunctionType": junction_type,
            "dataStructureState": ds,
            "description": description,
            "activeIndices": [],
        },
        student_answer=answer,
        error_history=[],
        scaffolding_level=ScaffoldingLevel.HIGH,
        session_id="sess-1",
    )


def test_heap_extract_accepts_extract_root_and_legacy_extract() -> None:
    assert evaluate_answer(_req("HEAP_EXTRACT", {"array": [9, 7, 5], "heapSize": 3}, "extract-root")) is True
    assert evaluate_answer(_req("HEAP_EXTRACT", {"array": [9, 7, 5], "heapSize": 3}, "extract")) is True
    assert evaluate_answer(_req("HEAP_EXTRACT", {"array": [9, 7, 5], "heapSize": 3}, "extract-last")) is False


def test_grid_next_cell_handles_bfs_dfs_and_rule_correct() -> None:
    grid = [[{"gScore": 1, "hScore": 5}, {"gScore": 2, "hScore": 3}], [{"gScore": 1, "hScore": 4}, {"gScore": 3, "hScore": 1}]]
    frontier = [[0, 0], [1, 0], [0, 1]]
    assert evaluate_answer(_req("GRID_NEXT_CELL", {"frontierCells": frontier, "grid": grid, "algorithmType": "bfs"}, "0,0")) is True
    assert evaluate_answer(_req("GRID_NEXT_CELL", {"frontierCells": frontier, "grid": grid, "algorithmType": "bfs"}, "0,1")) is False
    assert evaluate_answer(_req("GRID_NEXT_CELL", {"frontierCells": frontier, "grid": grid, "algorithmType": "dfs"}, "0,1")) is True
    assert evaluate_answer(_req("GRID_NEXT_CELL", {"frontierCells": frontier, "grid": grid, "algorithmType": "dfs"}, "0,0")) is False
    # Single-cell frontier offers conceptual 'rule-correct'
    assert evaluate_answer(_req("GRID_NEXT_CELL", {"frontierCells": [[0, 0]], "grid": grid, "algorithmType": "dfs"}, "rule-correct")) is True


def test_module_4_paradigm_evaluators() -> None:
    # PREFIX_CELL
    prefix_ds = {"current": [0, 2], "table": [[0, 4, None]], "input": [4, 7, 2]}
    assert evaluate_answer(_req("PREFIX_CELL", prefix_ds, "prefix-11")) is True
    assert evaluate_answer(_req("PREFIX_CELL", prefix_ds, "prefix-element")) is False

    # RANGE_QUERY
    assert evaluate_answer(_req("RANGE_QUERY", {"dependsOn": [[0, 1], [0, 4]]}, "range-correct")) is True
    assert evaluate_answer(_req("RANGE_QUERY", {"dependsOn": [[0, 1], [0, 4]]}, "range-off-by-one")) is False

    # STACK_DISCHARGE
    stack_ds = {"current": [0, 2], "input": [3, 1, 5], "marked": [0, 1]}
    assert evaluate_answer(_req("STACK_DISCHARGE", stack_ds, "discharge-yes")) is True
    assert evaluate_answer(_req("STACK_DISCHARGE", stack_ds, "discharge-no")) is False

    # COMBINE_RESULT
    desc = "Combine: left 4, right 3, crossing 6."
    assert evaluate_answer(_req("COMBINE_RESULT", {}, "combine-cross", description=desc)) is True
    assert evaluate_answer(_req("COMBINE_RESULT", {}, "combine-left", description=desc)) is False

    # GREEDY_CHOICE
    assert evaluate_answer(_req("GREEDY_CHOICE", {"working": "start 4 >= 3"}, "greedy-take")) is True
    assert evaluate_answer(_req("GREEDY_CHOICE", {"working": "start 2 >= 5"}, "greedy-skip")) is True

    # DP_CELL 1D and 2D
    dp1_ds = {"current": [0, 1], "dependsOn": [[0, 0]], "table": [[-2, None]], "input": [-2, 4]}
    assert evaluate_answer(_req("DP_CELL", dp1_ds, "dp1-4")) is True
    dp2_ds = {"current": [1, 1], "dependsOn": [[0, 1], [1, 0], [0, 0]], "table": [[0, 1], [1, None]], "input": []}
    assert evaluate_answer(_req("DP_CELL", dp2_ds, "dp2-1")) is True

    # PRUNE_BRANCH
    assert evaluate_answer(_req("PRUNE_BRANCH", {"total": 12, "target": 9}, "prune-yes")) is True
    assert evaluate_answer(_req("PRUNE_BRANCH", {"total": 5, "target": 9}, "prune-no")) is True
