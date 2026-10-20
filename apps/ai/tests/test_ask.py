"""Demo mode's free-form assistant (routers/ask.py).

The point of this endpoint is that it answers rather than interrogates, so
the tests here cover the two things that would break that: state grounding
(a question about what is on screen must be answered from the real state,
or refused) and validation (an answer that ignores the pseudocode's own
notation, or runs on, must not be shown as a tutor reply).
"""

from models.request_models import AskRequest, AskTurn
from prompts.templates import ASK_SYSTEM_PROMPT
from routers.ask import (
    MAX_HISTORY_TURNS,
    MAX_QUESTION_CHARS,
    _answer_failure,
    _format_conversation,
    _format_state,
)


def _request(**kwargs) -> AskRequest:
    defaults = {"algorithm_name": "Bubble Sort", "question": "What is a pass?"}
    return AskRequest(**{**defaults, **kwargs})


# ------------------------------------------------------------------ grounding
def test_format_state_renders_the_array_and_the_highlighted_positions():
    state = {"dataStructureState": [5, 3, 1], "activeIndices": [0, 1]}
    rendered = _format_state(_request(current_state=state, step_index=4))
    assert "step index 4" in rendered
    assert "[5, 3, 1]" in rendered
    assert "[0, 1]" in rendered


def test_format_state_tells_the_model_it_cannot_see_the_canvas_when_no_state_is_sent():
    # The system prompt leans on this sentence to refuse a question about
    # the current step instead of inventing one.
    rendered = _format_state(_request())
    assert "cannot see the current step" in rendered


def test_format_state_ignores_a_state_wrapper_that_carries_nothing_usable():
    rendered = _format_state(_request(current_state={"somethingElse": True}))
    assert "cannot see the current step" in rendered


def test_format_state_includes_the_on_screen_description_when_present():
    state = {"dataStructureState": [5, 3], "description": "Comparing 5 and 3"}
    assert "Comparing 5 and 3" in _format_state(_request(current_state=state))


# --------------------------------------------------------------- conversation
def test_format_conversation_says_so_on_the_first_question():
    assert "first question" in _format_conversation(_request())


def test_format_conversation_keeps_only_the_last_few_turns():
    turns = [AskTurn(question=f"q{i}", answer=f"a{i}") for i in range(MAX_HISTORY_TURNS + 3)]
    rendered = _format_conversation(_request(conversation=turns))
    assert "q0" not in rendered
    assert f"q{MAX_HISTORY_TURNS + 2}" in rendered
    assert rendered.count("Student:") == MAX_HISTORY_TURNS


def test_format_conversation_keeps_the_turns_oldest_first():
    turns = [AskTurn(question="first", answer="a1"), AskTurn(question="second", answer="a2")]
    rendered = _format_conversation(_request(conversation=turns))
    assert rendered.index("first") < rendered.index("second")


# ---------------------------------------------------------------- validation
PSEUDOCODE = "for i from 0 to n-1:\n  if arr[j] > arr[j+1]: swap"


def test_answer_failure_passes_a_short_grounded_answer():
    answer = "A pass is one sweep over the array, comparing arr[j] with arr[j+1] at every position."
    assert _answer_failure(answer, PSEUDOCODE) is None


def test_answer_failure_rejects_an_empty_answer():
    assert _answer_failure("", PSEUDOCODE) is not None


def test_answer_failure_rejects_an_answer_that_runs_past_the_sentence_cap():
    answer = " ".join("This is a sentence about the array." for _ in range(9))
    why = _answer_failure(answer, PSEUDOCODE)
    assert why is not None
    assert why.startswith("answer.")


def test_answer_failure_rejects_notation_the_pseudocode_does_not_use():
    # The student is looking at arr[j] in the Pseudocode tab. An answer
    # written in A[i] notation describes a different program to them.
    answer = "Compare A[i] with A[i - 1] and swap them when the left one is larger."
    assert _answer_failure(answer, PSEUDOCODE) == "answer.notation"


# --------------------------------------------------------------- the contract
def test_question_is_truncated_rather_than_rejected():
    long_question = "why? " * 500
    request = _request(question=long_question)
    assert len(request.question.strip()[:MAX_QUESTION_CHARS]) == MAX_QUESTION_CHARS


def test_system_prompt_forbids_asking_the_student_a_question_back():
    # This is the whole difference from the hint endpoint. If this line ever
    # goes, Demo mode starts interrogating students who only wanted an
    # explanation, which is the behaviour this endpoint exists to prevent.
    lowered = ASK_SYSTEM_PROMPT.lower()
    assert "do not ask the student a question back" in lowered
    assert "not a socratic session" in lowered


def test_system_prompt_keeps_the_answer_on_topic():
    # Normalised: the prompt is hard-wrapped, so the phrase spans a newline.
    flat = " ".join(ASK_SYSTEM_PROMPT.lower().split())
    assert "only help with the algorithm on screen" in flat
    assert "do not answer it anyway" in flat


def test_request_carries_no_scaffolding_level():
    # Demo mode's assistant explains on request and never assesses, so
    # there is nothing to calibrate. A scaffolding level appearing here
    # would mean the Socratic machinery had leaked into Demo.
    assert "scaffolding_level" not in AskRequest.model_fields
