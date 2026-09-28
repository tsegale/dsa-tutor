"""Feedback on a wrong answer must not give away the right one (prompt
2026-09-28.7). The check runs on every feedback field and on each streamed
sentence before it is shown."""

from models.request_models import PredictionRequest
from routers.predictions import _feedback_field_failures, _prepare_prediction, _sentence_check
from models.request_models import ScaffoldingLevel
from services.answer_leak import build_leak_check

PASS_LABEL = "The largest remaining unsorted element is now in its correct position"
DELETE_LABEL = "Copy in its in-order successor (the smallest value in its right subtree), then remove that node"


def test_the_sentence_that_leaked_live_is_caught():
    leaks = build_leak_check("1 comparison", 1)
    assert leaks("You estimated 4 comparisons, but the algorithm only made 1 comparison on this run with 2 elements.")
    assert leaks("It only made one comparison.")


def test_the_input_size_and_the_students_own_estimate_are_not_leaks():
    leaks = build_leak_check("1 comparison", 1)
    assert not leaks("You estimated 4 comparisons for an array of 2 elements, which grows like n squared.")
    # A value equal to n, stated as the input size, is the question's own data.
    assert not build_leak_check("3 comparisons", 3)("This run sorted 3 elements - how does n(n-1)/2 compare?")


def test_restating_or_paraphrasing_the_right_option_is_caught():
    assert build_leak_check(PASS_LABEL, None)(
        "After one pass the largest remaining unsorted element is in its correct position, not the whole array."
    )
    assert build_leak_check(DELETE_LABEL, None)(
        "It should take the value of its in-order successor, the smallest value in its right subtree."
    )


def test_explaining_what_goes_wrong_is_not_a_leak():
    assert not build_leak_check(PASS_LABEL, None)(
        "You said the whole array is sorted, but only one pass has run, so the front of the array has not been checked yet."
    )
    assert not build_leak_check(DELETE_LABEL, None)(
        "Replacing it with its left child would lose everything in its right subtree."
    )


def test_nothing_to_check_against_gives_no_check():
    assert build_leak_check(None, None) is None
    assert build_leak_check("", None) is None


def _request(correct_label: str | None, answer: str = "wrong-2") -> PredictionRequest:
    return PredictionRequest(
        algorithm_name="Bubble Sort",
        step_index=9,
        current_state={
            "dataStructureState": [1, 2],
            "activeIndices": [],
            "criticalJunctionType": "COMPLEXITY_PREDICTION",
            "metrics": {"n": 2, "comparisons": 1, "swaps": 1},
        },
        student_answer=answer,
        student_answer_label="4 comparisons",
        correct_answer_label=correct_label,
        scaffolding_level="HIGH",
        session_id="s",
        junction_type="COMPLEXITY_PREDICTION",
    )


def test_a_wrong_answer_fails_a_leaking_field_as_answer_leak():
    prep = _prepare_prediction(_request("1 comparison"))
    feedback = {
        "consequence_explanation": "You estimated 4 comparisons, but the run made 1 comparison.",
        "counterfactual_trace": "If the run had made 4 comparisons, it would not match the pseudocode for n equal to 2.",
        "socratic_hint": "Bubble Sort makes at most n(n-1)/2 comparisons. What does that give here?",
        "misconception_category": "COMPLEXITY_MISATTRIBUTION",
        "xp_awarded": 0,
    }
    failures = _feedback_field_failures(feedback, prep.correct, ScaffoldingLevel.HIGH, prep.wrapper, None, prep.leaks_answer)
    assert failures == {"consequence_explanation": "answer_leak"}


def test_the_count_is_checked_even_without_a_label():
    prep = _prepare_prediction(_request(None))
    assert prep.leaks_answer is not None and prep.leaks_answer("It made 1 comparison.")


def test_a_correct_answer_has_nothing_left_to_leak():
    assert _prepare_prediction(_request("1 comparison", answer="correct")).leaks_answer is None


def test_a_leaking_sentence_is_never_streamed():
    check = _sentence_check("for i from 0 to n-1 do", build_leak_check("1 comparison", 1))
    assert check("The run made 1 comparison.") == "answer_leak"
    assert check("Your estimate grows like n squared.") is None
