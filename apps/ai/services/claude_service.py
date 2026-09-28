import asyncio
import json
import logging
import os
import re
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from anthropic import APITimeoutError, AsyncAnthropic

logger = logging.getLogger(__name__)

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model_name = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
max_tokens = int(os.getenv("MAX_TOKENS", "1000"))
# The prediction feedback JSON is four short fields (two sentences, a
# question, an integer); 1000 tokens let the counterfactual run long and
# slow every call down. A response cut off at this limit is caught as
# "truncated" below rather than shown half-finished.
feedback_max_tokens = int(os.getenv("FEEDBACK_MAX_TOKENS", "400"))
# Low but non-zero: tutoring feedback should be reproducible across
# participants in the study, not creative, but 0 can make the model overly
# repetitive across genuinely different student answers.
temperature = float(os.getenv("CLAUDE_TEMPERATURE", "0.25"))
request_timeout_seconds = float(os.getenv("CLAUDE_TIMEOUT_SECONDS", "20"))
# Wall-clock ceiling for the single retry a failed validation may earn. The
# first call keeps request_timeout_seconds; the retry only gets this long,
# so the worst case is one full call plus this budget rather than the four
# sequential calls the old nested JSON-retry and validation-retry allowed.
retry_budget_seconds = float(os.getenv("CLAUDE_RETRY_BUDGET_SECONDS", "4"))
# Prompt caching TTL for the static prefix of prediction feedback: "5m"
# (default; refreshed on every use) or "1h" (2x write price, worth it when
# participants run back to back with gaps over five minutes). Caching is an
# infrastructure optimisation only - the model receives the same text.
cache_ttl = os.getenv("CLAUDE_CACHE_TTL", "5m")

# A prompt or system prompt is either plain text or a list of content blocks
# (the block form is what lets part of it carry cache_control).
Prompt = str | list[dict]


def cache_control() -> dict:
    return {"type": "ephemeral", "ttl": "1h"} if cache_ttl == "1h" else {"type": "ephemeral"}


def cached_text_block(text: str) -> dict:
    """A text block marked as a cache breakpoint: everything up to and
    including it is cached as a prefix. Below the model's minimum cacheable
    length (1024 tokens on Sonnet 4.6) the marker silently does nothing."""
    return {"type": "text", "text": text, "cache_control": cache_control()}

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
    # "max_tokens" means the response was cut off at the token limit.
    stop_reason: str | None = None
    # Prompt-cache accounting: tokens written to / served from the cache.
    # input_tokens excludes both. A hit rate of reads / (reads + writes) is
    # the evidence caching worked with no behavioural effect.
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    # Streams only: time from sending the request to the first text chunk.
    first_token_ms: int | None = None


def _metadata(usage, started: float, stop_reason: str | None, first_token_ms: int | None = None) -> CallMetadata:
    # getattr: the cache fields are absent on responses that never touched
    # the cache, and on older SDK response models.
    return CallMetadata(
        latency_ms=round((time.monotonic() - started) * 1000),
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        stop_reason=stop_reason,
        cache_creation_input_tokens=getattr(usage, "cache_creation_input_tokens", None) or 0,
        cache_read_input_tokens=getattr(usage, "cache_read_input_tokens", None) or 0,
        first_token_ms=first_token_ms,
    )


def has_self_correction_marker(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in SELF_CORRECTION_MARKERS)


def _sentence_count(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s])


def field_failure(
    text: str | None,
    *,
    max_sentences: int | None = None,
    max_words: int | None = None,
    allow_empty: bool = False,
) -> str | None:
    """Names the first rule a generated field breaks, or None if it passes.
    A field fails if it's empty (unless the field is allowed to be, e.g.
    counterfactual_trace on a correct answer), contains a mid-answer
    self-correction marker, or exceeds the sentence/word limit stated in its
    own prompt instruction. The name is logged on every retry, so a rule
    that fails often points at a prompt to fix rather than retry against."""
    if text is None or not text.strip():
        return None if allow_empty else "empty"
    if has_self_correction_marker(text):
        return "self_correction"
    if max_sentences is not None and _sentence_count(text) > max_sentences:
        return "sentences"
    if max_words is not None and len(text.split()) > max_words:
        return "words"
    return None


def is_field_valid(
    text: str | None,
    *,
    max_sentences: int | None = None,
    max_words: int | None = None,
    allow_empty: bool = False,
) -> bool:
    return field_failure(text, max_sentences=max_sentences, max_words=max_words, allow_empty=allow_empty) is None


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


async def _create_message(
    prompt: Prompt,
    system: Prompt | None,
    *,
    timeout: float | None = None,
    max_retries: int | None = None,
    token_limit: int | None = None,
) -> tuple[str, CallMetadata]:
    start = time.monotonic()
    # max_retries=0 on a budgeted retry: the SDK's own transparent retries
    # would otherwise add hidden sequential calls on top of ours.
    caller = client if max_retries is None else client.with_options(max_retries=max_retries)
    response = await caller.messages.create(
        model=model_name,
        max_tokens=token_limit or max_tokens,
        temperature=temperature,
        timeout=timeout or request_timeout_seconds,
        system=system or "",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text, _metadata(response.usage, start, response.stop_reason)


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


JSON_RETRY_SUFFIX = (
    "\n\nYour previous response was not valid JSON. Respond with the raw JSON "
    "object only - no markdown, no code fences, no commentary before or after it."
)


def _with_json_reminder(prompt: Prompt) -> Prompt:
    if isinstance(prompt, str):
        return prompt + JSON_RETRY_SUFFIX
    return [*prompt, {"type": "text", "text": JSON_RETRY_SUFFIX.strip()}]


async def attempt_feedback(
    prompt: Prompt,
    system: Prompt | None,
    *,
    retry_reason: str | None,
    token_limit: int | None = None,
) -> tuple[dict | None, CallMetadata]:
    """One feedback call with no retry of its own: returns (None, metadata)
    for a response that is not valid JSON, so the caller's single bounded
    retry covers parse failures and validation failures alike."""
    budgeted = retry_reason is not None
    text, metadata = await _create_message(
        _with_json_reminder(prompt) if retry_reason == "json_parse" else prompt,
        system,
        timeout=retry_budget_seconds if budgeted else None,
        max_retries=0 if budgeted else None,
        token_limit=token_limit,
    )
    try:
        return _sanitize_feedback_dashes(json.loads(_strip_code_fences(text))), metadata
    except json.JSONDecodeError:
        return None, metadata


async def attempt_text(prompt: str, system: str | None, *, retry_reason: str | None) -> tuple[str, CallMetadata]:
    """One plain-text call; a retry runs on the retry budget with no SDK retries."""
    budgeted = retry_reason is not None
    text, metadata = await _create_message(
        prompt,
        system,
        timeout=retry_budget_seconds if budgeted else None,
        max_retries=0 if budgeted else None,
    )
    return sanitize_dashes(text.strip()), metadata


async def stream_message(
    prompt: Prompt,
    system: Prompt | None,
    *,
    token_limit: int | None = None,
) -> AsyncIterator[tuple[str, str | CallMetadata]]:
    """Streams one call: yields ("text", chunk) as the model writes, then a
    single ("done", CallMetadata) once the message is complete. Chunks are
    dash-sanitised for display; the caller still parses and validates the
    assembled text before treating any of it as final."""
    start = time.monotonic()
    async with client.messages.stream(
        model=model_name,
        max_tokens=token_limit or max_tokens,
        temperature=temperature,
        timeout=request_timeout_seconds,
        system=system or "",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        first_token_ms: int | None = None
        async for chunk in stream.text_stream:
            if first_token_ms is None:
                first_token_ms = round((time.monotonic() - start) * 1000)
            yield "text", chunk
        final = await stream.get_final_message()
    yield "done", _metadata(final.usage, start, final.stop_reason, first_token_ms)


def parse_feedback_json(text: str) -> dict | None:
    """The same parse attempt_feedback applies, for text assembled from a stream."""
    try:
        return _sanitize_feedback_dashes(json.loads(_strip_code_fences(text)))
    except json.JSONDecodeError:
        return None


T = TypeVar("T")


@dataclass
class BoundedCall(Generic[T]):
    """value is None when the caller should fall back; failure_reason says why."""

    value: T | None
    attempts: int
    retry_reason: str | None
    failure_reason: str | None
    latency_ms: int
    # From the last call made; shows how close responses run to the limit.
    output_tokens: int = 0


async def call_with_bounded_retry(
    attempt: Callable[[str | None], Awaitable[tuple[T, CallMetadata]]],
    failure_of: Callable[[T], str | None],
    label: str,
    *,
    allow_retry: bool = True,
) -> BoundedCall[T]:
    """At most two calls: the first on the normal timeout, and one retry -
    only if the first fails validation - hard-capped at
    retry_budget_seconds of wall clock. allow_retry=False makes a failed
    first call fall back immediately. Exceptions from the first call
    propagate so the caller's fallback handles them."""
    start = time.monotonic()

    def elapsed() -> int:
        return round((time.monotonic() - start) * 1000)

    first, metadata = await attempt(None)
    logger.info(
        "AI %s call: latency_ms=%s input_tokens=%s cache_write=%s cache_read=%s output_tokens=%s stop_reason=%s",
        label, metadata.latency_ms, metadata.input_tokens, metadata.cache_creation_input_tokens,
        metadata.cache_read_input_tokens, metadata.output_tokens, metadata.stop_reason,
    )
    reason = "truncated" if metadata.stop_reason == "max_tokens" else failure_of(first)
    if reason is None:
        return BoundedCall(first, 1, None, None, elapsed(), metadata.output_tokens)
    if not allow_retry:
        logger.warning("AI %s failed validation: reason=%s, falling back (no retry)", label, reason)
        return BoundedCall(None, 1, None, reason, elapsed(), metadata.output_tokens)

    logger.info("AI %s retry: reason=%s", label, reason)
    try:
        second, metadata = await asyncio.wait_for(attempt(reason), timeout=retry_budget_seconds)
    except (asyncio.TimeoutError, APITimeoutError):
        logger.warning(
            "AI %s retry exceeded %.1fs budget, falling back (first failure: %s)",
            label, retry_budget_seconds, reason,
        )
        return BoundedCall(None, 2, reason, "retry_timeout", elapsed())
    logger.info(
        "AI %s retry call: latency_ms=%s output_tokens=%s stop_reason=%s",
        label, metadata.latency_ms, metadata.output_tokens, metadata.stop_reason,
    )
    second_reason = "truncated" if metadata.stop_reason == "max_tokens" else failure_of(second)
    if second_reason is not None:
        logger.warning("AI %s retry also failed: reason=%s, falling back", label, second_reason)
        return BoundedCall(None, 2, reason, second_reason, elapsed(), metadata.output_tokens)
    return BoundedCall(second, 2, reason, None, elapsed(), metadata.output_tokens)
