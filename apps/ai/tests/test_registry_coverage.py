"""Coverage guard: every topic seeded into the database must resolve to a
real prompt module, not the generic fallback - a topic with no context
means every AI feedback and hint response for it is generated blind
(see prompts/registry.py's final fallback line).

The same holds per junction: every junction type an algorithm can emit
(tests/fixtures/junction_manifest.json, written by the web's
junctionManifest.test.ts from real engine runs) needs specific
CRITICAL_JUNCTION_GUIDANCE, or the prompt's "what this junction is
testing" line is empty for it."""

import json
import re
from pathlib import Path

import pytest

from prompts.registry import get_algorithm_context

SEED_PATH = Path(__file__).resolve().parents[2] / "api" / "prisma" / "seed.ts"

GENERIC_CONTEXT = "Generic algorithm context."
GENERIC_PSEUDOCODE = "No pseudocode available."


def _seeded_topic_names() -> list[str]:
    text = SEED_PATH.read_text(encoding="utf-8")
    # Only the TOPICS array - seed.ts also declares BADGES with the same
    # `name: '...'` shape, and badge slugs are not algorithm topics.
    topics_block = re.search(r"const TOPICS = \[(.*?)\n\] as const", text, re.DOTALL)
    if topics_block is None:
        return []
    return re.findall(r"name:\s*'([^']+)'", topics_block.group(1))


SEEDED_TOPIC_NAMES = _seeded_topic_names()


def test_seed_file_is_readable():
    # If this is empty, the regex or path broke silently and every other
    # test in this file would pass for the wrong reason (vacuous truth).
    assert len(SEEDED_TOPIC_NAMES) > 30


@pytest.mark.parametrize("topic_name", SEEDED_TOPIC_NAMES)
def test_topic_has_real_context(topic_name: str):
    context, pseudocode, _guidance = get_algorithm_context(topic_name)
    assert context != GENERIC_CONTEXT, f"'{topic_name}' has no prompt context - feedback for it is generated blind"
    assert pseudocode != GENERIC_PSEUDOCODE, f"'{topic_name}' has no pseudocode registered"


MANIFEST_PATH = Path(__file__).resolve().parent / "fixtures" / "junction_manifest.json"
JUNCTION_MANIFEST: dict[str, list[str]] = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
JUNCTION_PAIRS = [(algorithm, junction) for algorithm, junctions in JUNCTION_MANIFEST.items() for junction in junctions]

# Shorter than this, guidance cannot name what the junction tests and how to
# ground the feedback - it is a placeholder, not guidance.
MIN_GUIDANCE_CHARS = 80


def test_junction_manifest_is_readable():
    assert len(JUNCTION_MANIFEST) > 40
    assert len(JUNCTION_PAIRS) > 90


@pytest.mark.parametrize(("algorithm", "junction"), JUNCTION_PAIRS)
def test_junction_has_specific_guidance(algorithm: str, junction: str):
    context, _pseudocode, guidance = get_algorithm_context(algorithm)
    assert context != GENERIC_CONTEXT, f"'{algorithm}' resolves to the generic context"
    text = guidance.get(junction, "")
    assert len(text) >= MIN_GUIDANCE_CHARS, f"'{algorithm}' emits {junction} but has no specific guidance for it"


def test_pivot_selection_guidance_is_graded():
    _context, _pseudocode, guidance = get_algorithm_context("quick-sort")
    assert "explanation step" not in guidance["PIVOT_SELECTION"]
    assert "median of three" in guidance["PIVOT_SELECTION"]


# ---------------------------------------------------------------- Feynman (Phase 8C)

CURRICULUM_PATH = Path(__file__).resolve().parents[2] / "web" / "src" / "config" / "curriculum.ts"
FEYNMAN_WEB_PATH = Path(__file__).resolve().parents[2] / "web" / "src" / "utils" / "feynmanRubrics.ts"


def _seeded_display_names() -> dict[str, str]:
    text = SEED_PATH.read_text(encoding="utf-8")
    topics_block = re.search(r"const TOPICS = \[(.*?)\n\] as const", text, re.DOTALL)
    pairs = re.findall(r"name:\s*'([^']+)',\s*displayName:\s*'((?:[^'\\]|\\.)+)'", topics_block.group(1) if topics_block else "")
    return {slug: display.replace("\\'", "'") for slug, display in pairs}


def _module_topics(numbers: set[int]) -> list[str]:
    text = CURRICULUM_PATH.read_text(encoding="utf-8")
    topics: list[str] = []
    for block in re.split(r"\n  \{\n", text):
        number = re.search(r"number:\s*(\d+),", block)
        listed = re.search(r"topics:\s*\[(.*?)\]", block, re.DOTALL)
        if number and listed and int(number.group(1)) in numbers:
            topics += re.findall(r"'([^']+)'", listed.group(1))
    return topics


DISPLAY_NAMES = _seeded_display_names()
MODULES_1_TO_3 = _module_topics({1, 2, 3})
FEYNMAN_REQUIRED = sorted(set(MODULES_1_TO_3) | {"bubble-sort", "binary-search", "bst"})


def test_curriculum_and_seed_are_readable():
    assert len(DISPLAY_NAMES) > 60
    assert len(MODULES_1_TO_3) == 28


@pytest.mark.parametrize("slug", sorted(DISPLAY_NAMES))
def test_every_seeded_display_name_resolves_to_its_slug(slug: str):
    from prompts.complexity import topic_slug

    assert topic_slug(DISPLAY_NAMES[slug]) == slug
    assert topic_slug(slug) == slug


@pytest.mark.parametrize("slug", FEYNMAN_REQUIRED)
def test_modules_1_to_3_have_a_real_feynman_rubric_with_the_three_complexity_criteria(slug: str):
    from prompts.complexity import COMPLEXITY_LABELS
    from routers.feynman import rubric_for

    key, rubric = rubric_for(DISPLAY_NAMES[slug])
    assert key != "default", f"{slug} falls back to the generic Feynman rubric"
    labels = [label for _criterion, label in rubric]
    assert tuple(labels[-3:]) == COMPLEXITY_LABELS, f"{slug} lacks the complexity criteria"
    assert len(labels) >= 6, f"{slug} has fewer than three mechanics items"
    assert len(set(labels)) == len(labels)


def test_the_web_offers_feynman_mode_exactly_where_a_real_rubric_exists():
    from routers.feynman import rubric_for

    source = FEYNMAN_WEB_PATH.read_text(encoding="utf-8")
    # Comments first: a // line explaining the set is not part of it, and an
    # apostrophe in one ("the stack's inner loop") used to be read as the
    # start of a quoted entry, which made this test fail on prose.
    source = re.sub(r"//[^\n]*", "", source)
    block = re.search(r"new Set\(\[(.*?)\]\)", source, re.DOTALL)
    # Single- or double-quoted entries ("Dijkstra's Algorithm").
    offered = {a or b for a, b in re.findall(r"'([^']+)'|\"([^\"]+)\"", block.group(1) if block else "")}
    for name in offered:
        assert rubric_for(name)[0] != "default", f"the web offers Feynman mode for {name}, which has no rubric"
    for slug in FEYNMAN_REQUIRED:
        assert DISPLAY_NAMES[slug] in offered, f"the web does not offer Feynman mode for {slug}"


def test_the_generic_fallback_logs_a_warning(caplog):
    from routers.feynman import rubric_for

    with caplog.at_level("WARNING"):
        assert rubric_for("Maze via Prim's")[0] == "default"
    assert "feynman_rubric_missing" in caplog.text


def test_only_live_families_are_used_for_grading_and_mazes_never_are():
    from prompts.feynman_rubrics_advanced import FAMILIES, GENERIC_BY_DECISION, LIVE_FAMILIES
    from routers.feynman import FEYNMAN_RUBRIC

    assert sum(len(topics) for topics in FAMILIES.values()) == 42
    for family, topics in FAMILIES.items():
        for key in topics:
            assert (key in FEYNMAN_RUBRIC) == (family in LIVE_FAMILIES), f"{key} live state does not match its family"
    assert not set(GENERIC_BY_DECISION) & set(FEYNMAN_RUBRIC)


def test_every_live_rubric_carries_the_complexity_criteria():
    from prompts.complexity import COMPLEXITY_LABELS
    from routers.feynman import FEYNMAN_RUBRIC, rubric_for

    for key in FEYNMAN_RUBRIC:
        labels = tuple(label for _criterion, label in rubric_for(key)[1][-3:])
        assert labels == COMPLEXITY_LABELS, f"live rubric {key} has no complexity criteria"


MODULES_4_TO_6 = _module_topics({4, 5, 6})


def test_modules_4_to_6_are_readable():
    # Guards against the regex above silently matching nothing, which would
    # make every parametrised test below pass vacuously. The number is the
    # curriculum's, so it moves when the curriculum does.
    assert len(MODULES_4_TO_6) == 45


@pytest.mark.parametrize("slug", MODULES_4_TO_6)
def test_modules_4_to_6_have_a_real_rubric_except_the_maze_topics(slug: str):
    from prompts.complexity import COMPLEXITY_LABELS
    from prompts.feynman_rubrics_advanced import GENERIC_BY_DECISION
    from routers.feynman import rubric_for

    key, rubric = rubric_for(DISPLAY_NAMES[slug])
    if slug.replace("-", "_") in GENERIC_BY_DECISION:
        # Phase 8.1A decision: the maze topics stay on the generic rubric.
        assert key == "default"
        return
    assert key != "default", f"{slug} falls back to the generic Feynman rubric"
    labels = [label for _criterion, label in rubric]
    assert tuple(labels[-3:]) == COMPLEXITY_LABELS, f"{slug} lacks the complexity criteria"
    assert len(labels) >= 6, f"{slug} has fewer than three mechanics items"
