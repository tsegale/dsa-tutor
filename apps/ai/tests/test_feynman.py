"""Feynman rubric scoring (remediation doc Phase 7.1).

Covers the two defects the phase fixes: the model used to supply the score
and completeness judgement directly (unverifiable, inconsistent across
phrasing), and only Bubble Sort had a real rubric so every other topic's
score wasn't comparable. Also covers the anti-gaming overlap check."""

from routers.feynman import (
    FEYNMAN_RUBRIC,
    _looks_copied_from_reference,
    _normalize,
    score_feynman_response,
)

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
