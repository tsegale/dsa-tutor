"""Feynman rubrics carry three complexity criteria (Phase 8B), written from
data/complexity.json, and an explanation is complete only with all three."""

from prompts.complexity import CLARITY_LABEL, COMPLEXITY_LABELS, SPACE_LABEL, TIME_LABEL, complexity_criteria
from routers import feynman
from routers.feynman import rubric_for, score_feynman_response


def _judged(rubric, unmet: set[str]):
    return {
        "rubric_results": [{"concept_label": label, "met": label not in unmet} for _c, label in rubric],
        "feedback_summary": "Ok.",
        "follow_up_question": "Why?",
    }


def test_rubric_ends_with_time_space_and_clarity_written_from_the_topic_facts():
    _key, rubric = rubric_for("Quick Sort")
    assert [label for _c, label in rubric[-3:]] == [TIME_LABEL, SPACE_LABEL, CLARITY_LABEL]
    time, space, _clarity = (criterion for criterion, _label in rubric[-3:])
    assert "O(n²)" in time and "last-element pivot" in time
    assert "Merge Sort" in space and "O(log n)" in space


def test_complexity_criteria_resolve_display_names_with_aliases():
    for name in ("Binary Search Tree", "Breadth-First Search", "Depth-First Search", "Dijkstra's Algorithm"):
        assert len(complexity_criteria(name)) == 3, name


def test_complexity_items_weigh_the_same_as_mechanics_items():
    _key, rubric = rubric_for("Bubble Sort")
    result = score_feynman_response(rubric, _judged(rubric, {CLARITY_LABEL}))
    assert result.score == round((len(rubric) - 1) / len(rubric) * 100)


def test_missing_any_complexity_criterion_is_never_complete():
    _key, rubric = rubric_for("Bubble Sort")
    for label in COMPLEXITY_LABELS:
        result = score_feynman_response(rubric, _judged(rubric, {label}))
        assert result.is_complete is False, label
        assert result.follow_up_question == "Why?"
    assert score_feynman_response(rubric, _judged(rubric, set())).is_complete is True


def test_the_challenge_reaches_the_grader(monkeypatch):
    seen = {}

    async def call(prompt, system=None, **_kwargs):
        seen["prompt"] = prompt
        return {"rubric_results": [], "feedback_summary": ""}, None

    monkeypatch.setattr(feynman, "call_claude_for_feedback", call)
    from fastapi.testclient import TestClient
    from main import app

    challenge = "Explain why Quick Sort degrades to O(n²), how a randomised or median-of-three pivot prevents it, and what space the recursion costs."
    with TestClient(app) as client:
        client.post(
            "/api/v1/feynman/",
            json={
                "algorithm_name": "Quick Sort",
                "algorithm_context": "",
                "student_explanation": "You pick a pivot and split the rest around it, then do each side.",
                "completion_context": "a full run",
                "session_id": "s",
                "challenge_prompt": challenge,
            },
        )
    assert f"They were asked to: {challenge}" in seen["prompt"]
