import json
import os
import re

from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model_name = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
max_tokens = int(os.getenv("MAX_TOKENS", "1000"))

# Phrases that mark a model thinking out loud mid-answer rather than giving
# a clean, final response (e.g. "...index 1 (value 5... wait, still 5) -
# actually the array stays..."). A field containing one of these was never
# meant to be shown to a student verbatim.
SELF_CORRECTION_MARKERS = ("wait,", "actually,", "hmm", "let me")


def has_self_correction_marker(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in SELF_CORRECTION_MARKERS)


def _sentence_count(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s])


def is_field_valid(
    text: str | None,
    *,
    max_sentences: int | None = None,
    max_words: int | None = None,
    allow_empty: bool = False,
) -> bool:
    """A generated field is invalid if it's empty (unless the field is
    allowed to be, e.g. counterfactual_trace on a correct answer), contains
    a mid-answer self-correction marker, or exceeds the sentence/word limit
    stated in its own prompt instruction."""
    if text is None or not text.strip():
        return allow_empty
    if has_self_correction_marker(text):
        return False
    if max_sentences is not None and _sentence_count(text) > max_sentences:
        return False
    if max_words is not None and len(text.split()) > max_words:
        return False
    return True


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    return stripped


async def call_claude_for_feedback(prompt: str) -> dict:
    response = await client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    cleaned = _strip_code_fences(text)
    return json.loads(cleaned)


async def call_claude_for_text(prompt: str) -> str:
    response = await client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()
