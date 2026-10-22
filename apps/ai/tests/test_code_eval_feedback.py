"""Code feedback must say two different things, not one thing twice.

error_explanation and corrective_hint were filled from the same key, so a
student who got it wrong read the mistake card and then read the identical
sentence again as the hint below it. And a correct answer got one line of
praise, which is the same defect the prediction feedback had: the student
who writes working code is told the least about why it works.

These check the contract the prompt now states, and that the router routes
each field where the client expects it.
"""

import re

from routers.code_eval import CODE_EVAL_PROMPT, CODE_EVAL_PROMPT_VERSION


def schema_block() -> str:
    return CODE_EVAL_PROMPT.split("exact schema, in this order:")[1]


def field(name: str) -> str:
    block = schema_block()
    start = block.index(f'"{name}"')
    rest = block[start:]
    nxt = re.search(r'\n  "', rest)
    return rest[: nxt.start()] if nxt else rest


def test_the_two_fields_are_asked_for_separately() -> None:
    block = schema_block()
    assert '"what_happened"' in block
    assert '"corrective_hint"' in block


def test_the_explanation_is_never_empty() -> None:
    assert "Never empty" in field("what_happened")


def test_the_explanation_covers_a_correct_answer_too() -> None:
    """The half that did not exist: a correct answer used to get praise."""
    text = field("what_happened")
    assert "If the code is CORRECT" in text
    assert "If the code is WRONG" in text


def test_praise_is_forbidden_on_a_correct_answer() -> None:
    # Collapsed, because the prompt is wrapped text and a forbidden phrase
    # can straddle a line break.
    text = " ".join(field("what_happened").split())
    for word in ("praise", "well done", "exactly"):
        assert word in text, f"the prompt does not rule out {word}"


def test_a_wrong_answer_is_not_handed_the_fix() -> None:
    """The student retries, so no field may state the correct line."""
    text = field("what_happened")
    assert "never the fix" in text.lower()
    assert "paraphrase" in text


def test_the_hint_is_a_question_and_not_a_repeat() -> None:
    text = field("corrective_hint")
    assert "ONE question" in text
    assert "Never repeat what_happened" in text


def test_the_hint_is_empty_when_there_is_nothing_to_nudge() -> None:
    assert 'if correct: ""' in field("corrective_hint")


def test_the_prompt_is_versioned() -> None:
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", CODE_EVAL_PROMPT_VERSION)


def test_the_sandbox_result_is_still_stated_as_fact() -> None:
    """Correctness is decided by real execution, not by the model: this
    sentence is what stops it re-judging and contradicting the verdict the
    student is already looking at."""
    assert "Do not re-judge it" in CODE_EVAL_PROMPT
    assert "contradict it" in CODE_EVAL_PROMPT
