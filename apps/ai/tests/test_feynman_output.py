"""Feynman output and copy (Phase 8D): one follow-up question aimed at the
most important gap, complexity first, and no emoji in any Feynman string."""

import re
from pathlib import Path

from prompts.complexity import CLARITY_LABEL, SPACE_LABEL, TIME_LABEL
from routers import feynman
from routers.feynman import one_question, rubric_for, score_feynman_response

ROOT = Path(__file__).resolve().parents[2]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0000FE0F]")


def test_a_follow_up_is_one_question_even_if_the_model_asks_several():
    assert one_question("Why does it stop? And what about space?") == "Why does it stop?"
    assert one_question("Why does it stop?") == "Why does it stop?"
    assert one_question(None) is None


def test_the_grader_is_told_to_ask_about_complexity_gaps_first(monkeypatch):
    seen = {}

    async def call(prompt, system=None, **_kwargs):
        seen["prompt"] = prompt
        return {}, None

    monkeypatch.setattr(feynman, "call_claude_for_feedback", call)
    from fastapi.testclient import TestClient
    from main import app

    with TestClient(app) as client:
        client.post(
            "/api/v1/feynman/",
            json={"algorithm_name": "Merge Sort", "algorithm_context": "", "student_explanation": "It splits the list in two and then puts them back.", "completion_context": "a run", "session_id": "s"},
        )
    order = f'"{TIME_LABEL}", then "{SPACE_LABEL}", then "{CLARITY_LABEL}"'
    assert order in seen["prompt"]
    assert "exactly one follow-up question" in seen["prompt"]


def test_a_weak_answer_fails_every_complexity_criterion_and_gets_one_question():
    _key, rubric = rubric_for("Merge Sort")
    labels = [label for _c, label in rubric]
    reply = {
        "rubric_results": [{"concept_label": label, "met": label == labels[0]} for label in labels],
        "feedback_summary": "Ok so it divides things, but I am lost after that.",
        "follow_up_question": "Why does splitting in half make it faster than going one by one? Also what about memory?",
    }
    result = score_feynman_response(rubric, reply)
    assert result.is_complete is False
    assert {TIME_LABEL, SPACE_LABEL, CLARITY_LABEL} <= set(result.missing_concepts)
    assert result.follow_up_question == "Why does splitting in half make it faster than going one by one?"


def test_no_feynman_string_contains_an_emoji():
    files = [
        ROOT / "ai" / "routers" / "feynman.py",
        ROOT / "ai" / "prompts" / "complexity.py",
        ROOT / "ai" / "prompts" / "feynman_rubrics.py",
        ROOT / "ai" / "data" / "complexity.json",
        *sorted((ROOT / "web" / "src" / "components" / "feynman").glob("*.tsx")),
        ROOT / "web" / "src" / "utils" / "feynmanAccess.ts",
        ROOT / "web" / "src" / "config" / "complexity.ts",
    ]
    for path in files:
        found = EMOJI.findall(path.read_text(encoding="utf-8"))
        assert not found, f"{path.name} contains {found}"


def test_the_web_groups_complexity_by_the_same_three_labels():
    web = (ROOT / "web" / "src" / "config" / "complexity.ts").read_text(encoding="utf-8")
    for label in (TIME_LABEL, SPACE_LABEL, CLARITY_LABEL):
        assert f"'{label}'" in web, label
