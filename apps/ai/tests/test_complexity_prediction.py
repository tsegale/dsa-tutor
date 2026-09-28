"""COMPLEXITY_PREDICTION (Week 2 2C): graded deterministically by tile id -
the tiles are built from the run's own comparison counter - with no model
involvement in correctness."""

from models.request_models import PredictionRequest
from prompts.registry import get_algorithm_context
from routers.predictions import evaluate_answer


def request(answer: str) -> PredictionRequest:
    return PredictionRequest(
        algorithm_name="Bubble Sort",
        step_index=40,
        current_state={"dataStructureState": [1, 2, 3, 4, 5], "activeIndices": [], "criticalJunctionType": "COMPLEXITY_PREDICTION"},
        student_answer=answer,
        scaffolding_level="HIGH",
        session_id="s",
    )


def test_the_measured_count_tile_is_correct_and_every_other_is_wrong():
    assert evaluate_answer(request("correct")) is True
    for wrong in ("wrong-1", "wrong-2", "wrong-3"):
        assert evaluate_answer(request(wrong)) is False


def test_every_study_topic_has_feedback_guidance_for_it():
    for name in ("Bubble Sort", "Binary Search", "Binary Search Tree"):
        _, _, guidance = get_algorithm_context(name)
        assert "COMPLEXITY_PREDICTION" in guidance
