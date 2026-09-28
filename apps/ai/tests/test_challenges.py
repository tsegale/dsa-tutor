"""AI Challenge framing (Week 2 2D).

Challenge data is generated deterministically on the web client (see
apps/web/src/utils/challengeGenerators.test.ts, which now carries the
misconception-mapping tests that used to live here, extended to every
category and all three study topics). The model only writes one framing
sentence from the case's authored explanation; anything else falls back."""

from fastapi.testclient import TestClient

from main import app
from prompts.templates import PROMPT_VERSION
from routers import challenges
from services.claude_service import CallMetadata

META = CallMetadata(latency_ms=1, input_tokens=1, output_tokens=1)

REQUEST = {
    "algorithm_name": "Bubble Sort",
    "case_id": "already-sorted",
    "case_explanation": "Already-sorted array: the right call at every comparison is to leave the pair alone.",
}


def stub(monkeypatch, reply=None, error=None):
    seen = {}

    async def call(prompt, system=None):
        seen["prompt"] = prompt
        seen["system"] = system
        if error:
            raise error
        return reply, META

    monkeypatch.setattr(challenges, "call_claude_for_text", call)
    return seen


def post(body=None):
    with TestClient(app) as client:
        return client.post("/api/v1/challenges/", json=body or REQUEST).json()


def test_returns_only_the_framing_sentence_never_data(monkeypatch):
    seen = stub(monkeypatch, "Before you act on a pair, check whether it is really out of order.")
    body = post()
    assert body["hintForStudent"] == "Before you act on a pair, check whether it is really out of order."
    assert body["aiGenerated"] is True
    assert body["promptVersion"] == PROMPT_VERSION
    assert set(body) == {"hintForStudent", "aiGenerated", "failureReason", "promptVersion", "aiModel"}
    # The model is told why the case was chosen, not handed any data.
    assert REQUEST["case_explanation"] in seen["prompt"]


def test_rejects_more_than_one_sentence(monkeypatch):
    stub(monkeypatch, "Look closely. Then decide.")
    body = post()
    assert body["hintForStudent"] is None
    assert body["aiGenerated"] is False
    assert body["failureReason"] == "sentences"


def test_rejects_an_invented_value(monkeypatch):
    stub(monkeypatch, "Notice what happens when you compare 7 with its neighbour.")
    body = post()
    assert body["hintForStudent"] is None
    assert body["failureReason"] == "digit"


def test_falls_back_when_the_call_fails(monkeypatch):
    stub(monkeypatch, error=RuntimeError("credit balance too low"))
    body = post()
    assert body["hintForStudent"] is None
    assert body["aiGenerated"] is False
    assert body["failureReason"] == "error"


def test_supports_all_three_study_topics(monkeypatch):
    stub(monkeypatch, "Watch which side each value goes to.")
    for name in ("Bubble Sort", "Binary Search", "Binary Search Tree", "bst"):
        assert post({**REQUEST, "algorithm_name": name})["aiGenerated"] is True


def test_never_calls_the_model_for_a_topic_without_a_generator(monkeypatch):
    seen = stub(monkeypatch, "Anything.")
    body = post({**REQUEST, "algorithm_name": "Dijkstra's Algorithm"})
    assert body["hintForStudent"] is None
    assert body["failureReason"] == "unsupported_algorithm"
    assert "prompt" not in seen
