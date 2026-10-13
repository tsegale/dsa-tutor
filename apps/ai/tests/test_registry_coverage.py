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
