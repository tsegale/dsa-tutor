"""Coverage guard: every topic seeded into the database must resolve to a
real prompt module, not the generic fallback - a topic with no context
means every AI feedback and hint response for it is generated blind
(see prompts/registry.py's final fallback line)."""

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
