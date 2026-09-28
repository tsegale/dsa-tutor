"""Feynman rubric scoring (remediation doc Phase 7.1).

Covers the two defects the phase fixes: the model used to supply the score
and completeness judgement directly (unverifiable, inconsistent across
phrasing), and only Bubble Sort had a real rubric so every other topic's
score wasn't comparable. Also covers the anti-gaming overlap check."""

from routers.feynman import (
    DEFAULT_RUBRIC,
    FEYNMAN_RUBRIC,
    _looks_copied_from_reference,
    _normalize,
    score_feynman_response,
)

# Mirrors apps/api/src/config/studyTopics.ts's STUDY_TOPICS - the three
# fully instrumented algorithms used for the honours study. A generic
# three-item rubric would produce Feynman scores that aren't comparable
# across topics (see FEYNMAN_RUBRIC's own module comment), so every study
# topic must resolve to its own real rubric, not the DEFAULT_RUBRIC
# fallback - this is the regression guard for remediation doc 12B.4.
_STUDY_TOPIC_SLUGS = ["bubble-sort", "binary-search", "bst"]

RUBRIC = [
    ("mentions comparison of adjacent elements", "Comparing adjacent elements"),
    ("explains the swap condition", "When a swap happens"),
    ("describes the pass structure", "Making multiple passes"),
    ("explains early termination", "Stopping early once a pass makes no swaps"),
]


def test_score_is_the_proportion_of_concepts_met_not_a_model_supplied_number():
    data = {
        "rubric_results": [
            {"concept_label": "Comparing adjacent elements", "met": True},
            {"concept_label": "When a swap happens", "met": True},
            {"concept_label": "Making multiple passes", "met": False},
            {"concept_label": "Stopping early once a pass makes no swaps", "met": False},
        ],
        "feedback_summary": "ok",
        "follow_up_question": "what about passes?",
    }
    result = score_feynman_response(RUBRIC, data)
    assert result.score == 50
    assert result.missing_concepts == ["Making multiple passes", "Stopping early once a pass makes no swaps"]


def test_is_complete_computed_in_code_from_the_threshold_not_trusted_from_the_model():
    # All four concepts met - should be complete regardless of anything
    # else the model might have said about completeness.
    data = {
        "rubric_results": [{"concept_label": label, "met": True} for _c, label in RUBRIC],
        "feedback_summary": "great",
        "follow_up_question": "a question the model should not get to ask once complete",
    }
    result = score_feynman_response(RUBRIC, data)
    assert result.is_complete is True
    assert result.score == 100
    assert result.missing_concepts == []
    # A follow-up question is meaningless once complete - the router drops it.
    assert result.follow_up_question is None


def test_model_inventing_or_renaming_a_label_does_not_count_as_met():
    data = {
        "rubric_results": [
            {"concept_label": "Comparing adjacent elements", "met": True},
            {"concept_label": "A label the model made up", "met": True},
        ],
        "feedback_summary": "ok",
        "follow_up_question": None,
    }
    result = score_feynman_response(RUBRIC, data)
    # Only the one real, matched label counts - the invented label is
    # discarded and the three real labels the model never mentioned stay
    # unmet, not silently assumed met.
    assert result.score == 25
    assert len(result.missing_concepts) == 3


def test_missing_rubric_results_entirely_scores_zero_not_an_error():
    result = score_feynman_response(RUBRIC, {"feedback_summary": "", "follow_up_question": None})
    assert result.score == 0
    assert result.is_complete is False
    assert len(result.missing_concepts) == len(RUBRIC)


def test_normalize_matches_registry_normalisation_for_hyphenated_and_slug_names():
    assert _normalize("Bubble Sort") == "bubble_sort"
    assert _normalize("Breadth-First Search") == "breadth_first_search"
    assert _normalize("Radix Sort (LSD)") == "radix_sort_(lsd)"


def test_bfs_dfs_bst_rubrics_are_registered_under_both_slug_and_display_forms():
    # These three are exactly the topics whose seeded slug ("bfs") doesn't
    # normalise to the same string as their display name ("Breadth-First
    # Search") - both forms must resolve to the same rubric.
    assert FEYNMAN_RUBRIC["bfs"] == FEYNMAN_RUBRIC["breadth_first_search"]
    assert FEYNMAN_RUBRIC["dfs"] == FEYNMAN_RUBRIC["depth_first_search"]
    assert FEYNMAN_RUBRIC["bst"] == FEYNMAN_RUBRIC["binary_search_tree"]


def test_every_study_topic_has_a_real_feynman_rubric_not_the_generic_fallback():
    for slug in _STUDY_TOPIC_SLUGS:
        rubric = FEYNMAN_RUBRIC.get(_normalize(slug))
        assert rubric is not None, f"'{slug}' has no Feynman rubric registered at all"
        assert rubric != DEFAULT_RUBRIC, f"'{slug}' falls back to the generic rubric"


def test_looks_copied_flags_a_near_verbatim_restatement_of_the_reference():
    reference = "Bubble sort compares adjacent elements and swaps them if the left is greater than the right."
    copied = "bubble sort compares adjacent elements and swaps them if left greater than right"
    assert _looks_copied_from_reference(copied, reference) is True


def test_looks_copied_does_not_flag_a_genuine_own_words_explanation():
    reference = "Bubble sort compares adjacent elements and swaps them if the left is greater than the right."
    own_words = (
        "You basically keep checking two neighbours at a time, and if the one on the left "
        "is bigger you flip their positions, then keep going down the list."
    )
    assert _looks_copied_from_reference(own_words, reference) is False


def test_looks_copied_handles_empty_explanation_safely():
    assert _looks_copied_from_reference("", "some reference text with plenty of words here") is False


# ---------------------------------------------------------------- Week 2 2E

import re  # noqa: E402
from pathlib import Path  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from prompts.templates import PROMPT_VERSION  # noqa: E402
from routers import feynman  # noqa: E402

_STUDY_TOPICS_TS = Path(__file__).resolve().parents[2] / "api" / "src" / "config" / "studyTopics.ts"
# What the web client actually sends as algorithm_name for each study topic
# (the registry's displayName).
_STUDY_TOPIC_DISPLAY_NAMES = {"bubble-sort": "Bubble Sort", "binary-search": "Binary Search", "bst": "Binary Search Tree"}


def _study_topic_slugs_from_source() -> list[str]:
    source = _STUDY_TOPICS_TS.read_text()
    match = re.search(r"STUDY_TOPICS\s*=\s*\[([^\]]*)\]", source)
    assert match, "STUDY_TOPICS not found in studyTopics.ts"
    return re.findall(r"'([^']+)'", match.group(1))


def test_every_slug_in_study_topics_ts_resolves_to_a_non_default_rubric():
    # Read from the source of truth, so adding a study topic without a
    # rubric fails here instead of silently grading it generically.
    slugs = _study_topic_slugs_from_source()
    assert slugs, "no study topics parsed"
    for slug in slugs:
        key, rubric = feynman.rubric_for(slug)
        assert key != "default" and rubric != DEFAULT_RUBRIC, slug
        display_key, display_rubric = feynman.rubric_for(_STUDY_TOPIC_DISPLAY_NAMES[slug])
        assert display_rubric == rubric, f"{slug} and its display name grade differently"


def test_bst_rubric_covers_the_five_ideas_the_plan_names():
    labels = [label for _criterion, label in FEYNMAN_RUBRIC["binary_search_tree"]]
    assert len(labels) == 5
    criteria = " ".join(c for c, _l in FEYNMAN_RUBRIC["bst"])
    for idea in ("equal to a node goes right", "from the root downward", "determines the shape", "log n", "in-order"):
        assert idea in criteria, idea
    # Labels are stored as rubric item ids on the interaction row (max 200).
    assert all(len(label) <= 200 for label in labels)


REQUEST = {
    "algorithm_name": "Binary Search Tree",
    "algorithm_context": "",
    "student_explanation": "You start at the top and keep going left for smaller numbers and right for bigger or equal "
    "ones until there is a free spot, and the shape depends on the order you put them in.",
    "completion_context": "building a BST",
    "session_id": "s",
    "step_descriptions": [],
}


def _stub(monkeypatch, reply=None, error=None):
    async def call(prompt, system=None, **_kwargs):
        if error:
            raise error
        return reply, None

    monkeypatch.setattr(feynman, "call_claude_for_feedback", call)


def _post(body=None):
    with TestClient(app) as client:
        return client.post("/api/v1/feynman/", json=body or REQUEST).json()


def _all_labels(met: set[int]):
    return [
        {"concept_label": label, "met": i in met}
        for i, (_criterion, label) in enumerate(FEYNMAN_RUBRIC["binary_search_tree"])
    ]


def test_graded_explanation_reports_rubric_key_and_provenance(monkeypatch):
    _stub(monkeypatch, {"rubric_results": _all_labels({0, 1, 2}), "feedback_summary": "Ok I think I get it.", "follow_up_question": "Why?"})
    body = _post()
    assert body["score"] == 60
    assert body["rubric_key"] == "binary_search_tree"
    assert body["ai_generated"] is True
    assert body["prompt_version"] == PROMPT_VERSION
    assert [r["met"] for r in body["rubric_results"]] == [True, True, True, False, False]


def test_reused_wording_gets_a_follow_up_and_no_score(monkeypatch):
    _stub(monkeypatch, error=AssertionError("the model must not be called for copied wording"))
    copied = {**REQUEST, "student_explanation": "At node 8: is 4 smaller or larger? 4 inserted to the left of node 8.",
              "step_descriptions": ["At node 8: is 4 smaller or larger?", "4 inserted to the left of node 8."]}
    body = _post(copied)
    assert body["score"] is None
    assert body["failure_reason"] == "reused_wording"
    assert body["ai_generated"] is False
    assert "own words" in body["follow_up_question"]
    assert body["rubric_results"] == []


def test_a_judgement_missing_rubric_concepts_is_not_scored_as_zero(monkeypatch):
    _stub(monkeypatch, {"rubric_results": _all_labels({0})[:2], "feedback_summary": "Hmm.", "follow_up_question": None})
    body = _post()
    assert body["score"] is None
    assert body["failure_reason"] == "rubric_results.labels"


def test_an_unavailable_model_is_not_scored_as_zero(monkeypatch):
    _stub(monkeypatch, error=RuntimeError("credit balance too low"))
    body = _post()
    assert body["score"] is None
    assert body["failure_reason"] == "error"
    assert body["ai_generated"] is False
