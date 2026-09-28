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



# The model used to see only the tile id ("wrong-2") and invent what the
# student picked - live, it told a student who chose "4 comparisons" that
# "3 comparisons is too low". It now sees the tile's text and the run's count.

from routers.predictions import answer_for_prompt, build_comparison_context  # noqa: E402


def labelled(answer: str, label: str | None) -> PredictionRequest:
    return request(answer).model_copy(update={"student_answer_label": label})


def test_the_prompt_names_the_chosen_tile_text_with_its_id():
    assert answer_for_prompt(labelled("wrong-2", "4 comparisons")) == '"4 comparisons" (option id: wrong-2)'


def test_without_a_label_the_bare_answer_is_used():
    assert answer_for_prompt(labelled("swap", None)) == "swap"
    assert answer_for_prompt(labelled("swap", "  ")) == "swap"


def test_grading_ignores_the_label():
    assert evaluate_answer(labelled("wrong-2", "1 comparison")) is False
    assert evaluate_answer(labelled("correct", "4 comparisons")) is True


def test_complexity_context_states_the_measured_count_and_the_estimate():
    wrapper = {"dataStructureState": [1, 2], "metrics": {"n": 2, "comparisons": 1, "swaps": 1}}
    context = build_comparison_context("COMPLEXITY_PREDICTION", wrapper, '"4 comparisons" (option id: wrong-2)')
    assert "made 1 comparisons on 2 elements" in context
    assert '"4 comparisons"' in context
