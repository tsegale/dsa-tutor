"""Self-explanation grading (Week 2 2B).

The model judges each rubric criterion and writes one acknowledging
sentence plus at most one follow-up question. The score is computed here,
never by the model, and never shown as a number; a failed judgement falls
back without inventing criterion results."""

from fastapi.testclient import TestClient

from main import app
from prompts.templates import PROMPT_VERSION
from routers import self_explanation
from services.claude_service import CallMetadata

META = CallMetadata(latency_ms=1, input_tokens=1, output_tokens=1)

REQUEST = {
    "algorithm_name": "Bubble Sort",
    "prompt_key": "bubble-sort.pass-complete",
    "question": "Why is the largest unsorted element now guaranteed to be in its final position?",
    "rubric": [
        {"id": "carried_right", "criterion": "the larger value of each compared pair moves right"},
        {"id": "never_passed", "criterion": "the largest value cannot be left behind"},
        {"id": "not_revisited", "criterion": "later passes stop before that position"},
    ],
    "student_response": "Because every swap pushes the big one right so it ends at the end.",
}


def stub(monkeypatch, *replies):
    calls = []

    async def attempt(prompt, system, *, retry_reason, token_limit=None):
        calls.append(retry_reason)
        return replies[min(len(calls), len(replies)) - 1], META

    monkeypatch.setattr(self_explanation, "attempt_feedback", attempt)
    return calls


def post():
    with TestClient(app) as client:
        return client.post("/api/v1/self-explanations", json=REQUEST).json()


VALID = {
    "criteria": {"carried_right": True, "never_passed": True, "not_revisited": False},
    "acknowledgement": "You spotted that each swap carries the larger value to the right.",
    "follow_up_question": "What happens to that last position in the passes that follow?",
}


def test_scores_in_code_and_returns_per_criterion_results(monkeypatch):
    stub(monkeypatch, VALID)
    body = post()
    assert body["results"] == [
        {"id": "carried_right", "met": True},
        {"id": "never_passed", "met": True},
        {"id": "not_revisited", "met": False},
    ]
    assert body["score"] == 67
    assert body["aiGenerated"] is True
    assert body["followUpQuestion"] == VALID["follow_up_question"]
    assert body["promptVersion"] == PROMPT_VERSION


def test_all_met_means_no_follow_up(monkeypatch):
    stub(monkeypatch, {**VALID, "criteria": {k: True for k in VALID["criteria"]}, "follow_up_question": None})
    body = post()
    assert body["score"] == 100 and body["followUpQuestion"] is None


def test_an_acknowledgement_that_reads_as_a_grade_is_rejected(monkeypatch):
    graded = {**VALID, "acknowledgement": "That is 2 out of 3, nice work."}
    calls = stub(monkeypatch, graded, graded)
    body = post()
    assert calls == [None, "acknowledgement.grade"]
    assert body["aiGenerated"] is False
    assert body["results"] is None and body["score"] is None
    assert body["failureReason"] == "acknowledgement.grade"


def test_criteria_must_match_the_rubric_exactly(monkeypatch):
    missing = {**VALID, "criteria": {"carried_right": True}}
    stub(monkeypatch, missing, missing)
    assert post()["failureReason"] == "criteria.ids"


def test_follow_up_must_be_one_question(monkeypatch):
    two = {**VALID, "follow_up_question": "Is it fixed? Why?"}
    stub(monkeypatch, two, two)
    assert post()["failureReason"] == "follow_up_question.not_one_question"


def test_a_retry_that_passes_is_used(monkeypatch):
    calls = stub(monkeypatch, {**VALID, "acknowledgement": "Good. Very good."}, VALID)
    body = post()
    assert calls == [None, "acknowledgement.sentences"]
    assert body["aiGenerated"] is True


def test_a_model_error_falls_back_without_inventing_results(monkeypatch):
    async def boom(prompt, system, *, retry_reason, token_limit=None):
        raise RuntimeError("no credits")

    monkeypatch.setattr(self_explanation, "attempt_feedback", boom)
    body = post()
    assert body["results"] is None and body["score"] is None
    assert body["acknowledgement"] == self_explanation.FALLBACK_ACKNOWLEDGEMENT
    assert body["failureReason"] == "error"


def test_the_rubric_must_have_two_or_three_criteria():
    with TestClient(app) as client:
        res = client.post("/api/v1/self-explanations", json={**REQUEST, "rubric": REQUEST["rubric"][:1]})
    assert res.status_code == 422
