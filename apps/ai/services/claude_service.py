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

# The project's global style rule bans em/en dashes in every piece of
# copy, AI-generated included (remediation doc 12B.1) - the system
# prompts also ask for this, but a prompt instruction is a request, not a
# guarantee, so every text field the model returns is sanitised here
# regardless of whether it complied.
_DASH_PATTERN = re.compile(r"\s*[–—]\s*")


def sanitize_dashes(text: str) -> str:
    return _DASH_PATTERN.sub(" - ", text)


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


# An identifier immediately followed by a bracketed index, e.g. arr[j+1] or
# A[i - 1]. No whitespace is allowed before the bracket so a plain English
# "the array [5, 3, 1]" is never mistaken for pseudocode notation.
_ARRAY_REF_PATTERN = re.compile(r"\b([A-Za-z_]\w*)\[([^\[\]]*)\]")


def _array_refs(text: str) -> list[tuple[str, str]]:
    return [(name, re.sub(r"\s+", "", index)) for name, index in _ARRAY_REF_PATTERN.findall(text)]


def uses_foreign_array_notation(text: str | None, pseudocode: str) -> bool:
    """True when text writes array notation the student's pseudocode does
    not contain - e.g. a hint quoting "A[i - 1] > A[i]" while the Pseudocode
    tab shows "arr[j] > arr[j+1]". The array name must appear in the
    pseudocode, and a symbolic index must match one the pseudocode uses
    (whitespace ignored). A literal integer index on a known array, like
    arr[2], is allowed since it names a concrete position, not notation."""
    if not text:
        return False
    known_refs = set(_array_refs(pseudocode))
    known_names = {name for name, _ in known_refs}
    for name, index in _array_refs(text):
        if name not in known_names:
            return True
        if not index.isdigit() and (name, index) not in known_refs:
            return True
    return False


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


def _sanitize_feedback_dashes(feedback: dict) -> dict:
    return {key: sanitize_dashes(value) if isinstance(value, str) else value for key, value in feedback.items()}


async def call_claude_for_feedback(prompt: str, system: str | None = None) -> tuple[dict, CallMetadata]:
    text, metadata = await _create_message(prompt, system)
    try:
        return _sanitize_feedback_dashes(json.loads(_strip_code_fences(text))), metadata
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
        return _sanitize_feedback_dashes(json.loads(_strip_code_fences(text))), metadata


async def call_claude_for_text(prompt: str, system: str | None = None) -> tuple[str, CallMetadata]:
    text, metadata = await _create_message(prompt, system)
    return sanitize_dashes(text.strip()), metadata
