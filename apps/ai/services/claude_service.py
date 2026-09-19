import json
import os
import re
import time
from dataclasses import dataclass

from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model_name = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
max_tokens = int(os.getenv("MAX_TOKENS", "1000"))
# Low but non-zero: tutoring feedback should be reproducible across
# participants in the study, not creative, but 0 can make the model overly
# repetitive across genuinely different student answers.
temperature = float(os.getenv("CLAUDE_TEMPERATURE", "0.25"))
request_timeout_seconds = float(os.getenv("CLAUDE_TIMEOUT_SECONDS", "20"))

# Phrases that mark a model thinking out loud mid-answer rather than giving
# a clean, final response (e.g. "...index 1 (value 5... wait, still 5) -
# actually the array stays..."). A field containing one of these was never
# meant to be shown to a student verbatim.
SELF_CORRECTION_MARKERS = ("wait,", "actually,", "hmm", "let me")


@dataclass
class CallMetadata:
    latency_ms: int
    input_tokens: int
    output_tokens: int


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


async def _create_message(prompt: str, system: str | None) -> tuple[str, CallMetadata]:
    start = time.monotonic()
    response = await client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=request_timeout_seconds,
        system=system or "",
        messages=[{"role": "user", "content": prompt}],
    )
    metadata = CallMetadata(
        latency_ms=round((time.monotonic() - start) * 1000),
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )
    return response.content[0].text, metadata


async def call_claude_for_feedback(prompt: str, system: str | None = None) -> tuple[dict, CallMetadata]:
    text, metadata = await _create_message(prompt, system)
    try:
        return json.loads(_strip_code_fences(text)), metadata
    except json.JSONDecodeError:
        # Retry once, telling the model exactly what it did wrong. If this
        # also fails to parse, give up and let the caller fall back - a
        # second automatic retry risks doubling latency for no real gain.
        retry_prompt = (
            f"{prompt}\n\nYour previous response was not valid JSON. "
            "Respond with the raw JSON object only - no markdown, no code "
            "fences, no commentary before or after it."
        )
        text, metadata = await _create_message(retry_prompt, system)
        return json.loads(_strip_code_fences(text)), metadata


async def call_claude_for_text(prompt: str, system: str | None = None) -> tuple[str, CallMetadata]:
    text, metadata = await _create_message(prompt, system)
    return text.strip(), metadata
