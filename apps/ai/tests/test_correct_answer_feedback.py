"""A correct answer must get taught too, not only a wrong one.

The model call was always made on every submission - the student's
answer goes out before anyone knows whether it is right - but every text
field was defined only as "what goes wrong with your choice". On a
correct answer the model therefore returned an empty explanation, the
validator allowed it because the contract gave it nothing else to say,
and the student who answered well saw the least teaching. The call was
paid for and the text thrown away.

Two places have to agree for this to work: the prompt's contract for
each field and _feedback_field_failures, which decides whether what came
back is usable. These tests drive both from the same case so the pair
cannot drift apart again - a prompt that stops defining the correct case
would leave the validator demanding text the model is never asked for,
which is the failure mode that made 15 of 15 correct answers fall back
in the A2.2 measurement.
"""

from models.request_models import MisconceptionCategory, ScaffoldingLevel
from prompts.templates import FEEDBACK_SYSTEM_PROMPT
from routers.predictions import _feedback_field_failures
from services.fallback_service import get_fallback_prediction_response

WROTE_SOMETHING = {
    "consequence_explanation": "Swapping here puts 3 before 7, so every pair checked in this pass is in order.",
    "counterfactual_trace": "Had you left them, the 7 would stay at index 1 and travel no further this pass.",
    "socratic_hint": "What does the next pass still have to establish?",
}


def failures(feedback: dict[str, str], correct: bool) -> dict[str, str]:
    return _feedback_field_failures(feedback, correct, ScaffoldingLevel.MEDIUM)


def test_a_correct_answer_needs_an_explanation() -> None:
    """The regression this file exists for: empty was once accepted here."""
    empty = {**WROTE_SOMETHING, "consequence_explanation": ""}
    assert "consequence_explanation" in failures(empty, correct=True)


def test_a_correct_answer_may_have_no_road_not_taken() -> None:
    """Some junctions have no alternative worth tracing; an empty trace is
    simply not displayed, so it must not cost the explanation beside it."""
    assert failures({**WROTE_SOMETHING, "counterfactual_trace": ""}, correct=True) == {}


def test_a_wrong_answer_still_needs_both() -> None:
    for field in ("consequence_explanation", "counterfactual_trace"):
        assert field in failures({**WROTE_SOMETHING, field: ""}, correct=False)


def test_usable_text_passes_either_way() -> None:
    assert failures(WROTE_SOMETHING, correct=True) == {}
    assert failures(WROTE_SOMETHING, correct=False) == {}


def test_the_prompt_asks_for_what_the_validator_demands() -> None:
    """Without a correct-answer contract the demand above is unsatisfiable:
    the model would be rejected for not writing what it was never asked
    for, and every correct answer would fall back."""
    block = FEEDBACK_SYSTEM_PROMPT.split('"consequence_explanation"')[1].split('"counterfactual_trace"')[0]
    assert "If the answer was correct" in block
    assert "Never empty" in block


def test_the_prompt_forbids_praise() -> None:
    """"Correct! Well done" is not teaching, and it is what a model fills a
    newly-required field with when nothing else is asked of it."""
    block = FEEDBACK_SYSTEM_PROMPT.split("When the answer is correct")[1].split("\n\n")[0]
    for word in ("praise", "well done", "exactly"):
        assert word in block


def test_the_fallback_does_not_tell_a_correct_answer_it_was_wrong() -> None:
    """The fallback runs when the model call fails, which it can on a
    correct answer now that one is displayed. The wrong-answer text would
    contradict the verdict the student is looking at."""
    response = get_fallback_prediction_response(
        correct=True,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        algorithm_name="Bubble Sort",
        junction_type="SWAP_DECISION",
        ground_truth_misconception=None,
    )
    text = response.consequence_explanation
    assert "does not match" not in text
    assert text.strip() != ""
    assert response.ai_generated is False


def test_the_invariant_fallback_asks_about_an_invariant() -> None:
    """A pass boundary compares nothing, so "the values just compared" is
    the wrong thing to point a student at there."""
    response = get_fallback_prediction_response(
        correct=True,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        algorithm_name="Bubble Sort",
        junction_type="PASS_COMPLETE",
        ground_truth_misconception=None,
    )
    assert "invariant" in response.consequence_explanation


def test_the_ground_truth_label_is_untouched_by_any_of_this() -> None:
    response = get_fallback_prediction_response(
        correct=False,
        scaffolding_level=ScaffoldingLevel.MEDIUM,
        algorithm_name="Bubble Sort",
        junction_type="SWAP_DECISION",
        ground_truth_misconception=MisconceptionCategory.OFF_BY_ONE,
    )
    assert response.misconception_category == MisconceptionCategory.OFF_BY_ONE
