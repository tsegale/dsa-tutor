"""BST delete: the step at the node being removed asks how it is removed
(Week 2 2D's delete-two-children challenge). It used to be graded as a
left/right comparison of the target against itself, which marked "go right"
correct for a node equal to the target."""

from models.request_models import PredictionRequest
from routers.predictions import evaluate_answer


def request(answer: str, delete_case: str | None, target: int = 8) -> PredictionRequest:
    state = {
        "root": {"value": 8, "id": "n8", "left": None, "right": None},
        "currentNode": {"value": target, "id": f"n{target}", "left": None, "right": None},
        "targetValue": target,
        "path": [],
        "operation": "delete",
    }
    if delete_case:
        state["deleteCase"] = delete_case
    return PredictionRequest(
        algorithm_name="Binary Search Tree",
        step_index=3,
        current_state={"dataStructureState": state, "activeIndices": [], "criticalJunctionType": "BST_DIRECTION"},
        student_answer=answer,
        scaffolding_level="HIGH",
        session_id="s",
    )


def test_the_removal_step_is_graded_by_tile_id():
    for case in ("leaf", "one-child", "two-children"):
        assert evaluate_answer(request("correct", case)) is True
        assert evaluate_answer(request("go-right", case)) is False
        assert evaluate_answer(request("wrong-1", case)) is False


def test_the_search_down_to_it_is_still_a_left_right_comparison():
    assert evaluate_answer(request("go-left", None, target=4)) is False
    assert evaluate_answer(request("go-right", None, target=8)) is True
