"""Demo mode's free-form assistant.

Demo mode is where a student meets an algorithm: the animation plays, the AI
stays quiet, and nothing is graded. Clicking the AI Tutor tab there used to
show an empty panel, because every box in it (mistake analysis, the Socratic
hint, the scaffolding fader) only has content once a prediction has been
answered, and Demo mode has no predictions.

So this endpoint answers questions instead of asking them. It is the
deliberate opposite of routers/hints.py: no scaffolding level, no hint
ladder, no withholding. The Socratic machinery belongs to Practice mode.

Classic mode never reaches here. Classic is the study's control condition
and has no AI surface at all; the web client does not render the tab.
"""

import logging

from fastapi import APIRouter, Response

from models.request_models import AskRequest
from models.response_models import AskResponse
from prompts.complexity import COMPLEXITY, topic_slug
from prompts.registry import get_algorithm_context
from prompts.templates import ASK_SYSTEM_PROMPT, ASK_USER_TEMPLATE
from services.claude_service import (
    attempt_text,
    call_with_bounded_retry,
    field_failure,
    sanitize_dashes,
    uses_foreign_array_notation,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# The system prompt asks for at most 5 sentences. Validation allows one
# over: a hard 5 rejected otherwise good answers on a sentence-boundary
# technicality and sent them to the fallback, which is worse for the
# student than a slightly long reply.
MAX_ANSWER_SENTENCES = 6

# Long enough for a real question about an algorithm, short enough that the
# prompt cannot be used as a general-purpose text box.
MAX_QUESTION_CHARS = 500

# A Demo session can run for a while. Only the last few turns are worth
# carrying: enough for "why?" to resolve, not enough to grow unbounded.
MAX_HISTORY_TURNS = 4

FALLBACK_ANSWER = (
    "I could not reach the tutor service just now. The Theory tab explains how this "
    "algorithm works, and the Pseudocode tab shows the exact steps. Try asking again in a moment."
)


def _format_state(request: AskRequest) -> str:
    """A compact, literal rendering of what is on screen, or a sentence
    telling the model it cannot see the canvas. The system prompt leans on
    that sentence to refuse rather than invent a step."""
    state = request.current_state
    if not isinstance(state, dict):
        return "No visualisation state was sent, so you cannot see the current step."

    parts: list[str] = []
    if request.step_index is not None:
        parts.append(f"step index {request.step_index}")
    data = state.get("dataStructureState")
    if data is not None:
        parts.append(f"data structure now holds {data}")
    active = state.get("activeIndices")
    if isinstance(active, list) and active:
        parts.append(f"highlighted positions {active}")
    description = state.get("description")
    if isinstance(description, str) and description.strip():
        parts.append(f'the step is described on screen as "{description.strip()}"')

    if not parts:
        return "No visualisation state was sent, so you cannot see the current step."
    return "; ".join(parts) + "."


def _format_conversation(request: AskRequest) -> str:
    turns = request.conversation[-MAX_HISTORY_TURNS:]
    if not turns:
        return "Nothing yet; this is the student's first question."
    return "\n".join(f"Student: {turn.question}\nYou: {turn.answer}" for turn in turns)


def _answer_failure(answer: str, pseudocode: str) -> str | None:
    """Names the rule an answer breaks, or None. Logged on every retry."""
    why = field_failure(answer, max_sentences=MAX_ANSWER_SENTENCES)
    if why:
        return f"answer.{why}"
    if uses_foreign_array_notation(answer, pseudocode):
        return "answer.notation"
    return None


def _deterministic_ask_answer(request: AskRequest, algorithm_context: str, pseudocode: str) -> str:
    """Context-aware offline responder for Demo mode when the live Claude
    service is unreachable or unconfigured. Grounded in the current canvas
    snapshot, algorithm context, and complexity facts without asking a
    Socratic question back."""
    q_lower = request.question.lower()
    state = request.current_state if isinstance(request.current_state, dict) else {}
    description = str(state.get("description") or "").strip()
    data = state.get("dataStructureState")
    active = state.get("activeIndices")
    slug = topic_slug(request.algorithm_name)
    comp = COMPLEXITY.get(slug)

    parts: list[str] = []

    if any(k in q_lower for k in ("time", "complex", "big o", "fast", "slow", "worst", "average", "best", "space", "memory")) and comp:
        parts.append(
            f"{request.algorithm_name} runs in {comp['best']} best-case, {comp['average']} average-case, "
            f"and {comp['worst']} worst-case time, with {comp['space']} auxiliary space."
        )
        if comp.get("note"):
            parts.append(str(comp["note"]))
    elif any(k in q_lower for k in ("step", "now", "happening", "current", "why", "here", "doing")) and description:
        step_prefix = f"At step {request.step_index}, " if request.step_index is not None else "On this step, "
        parts.append(f"{step_prefix}the visualiser shows: {description}")
        if data is not None and isinstance(active, list) and active:
            parts.append(f"The highlighted positions {active} are currently being inspected in {data}.")
    else:
        first_sentences = [s.strip() for s in algorithm_context.split(".") if s.strip()][:2]
        if first_sentences:
            parts.append(". ".join(first_sentences) + ".")
        if description:
            parts.append(f"On the current canvas step: {description}")

    if not parts:
        return FALLBACK_ANSWER

    answer = sanitize_dashes(" ".join(parts))
    return answer


@router.post("/", response_model=AskResponse)
async def ask(request: AskRequest, response: Response) -> AskResponse:
    algorithm_context, registry_pseudocode, _ = get_algorithm_context(request.algorithm_name)
    pseudocode = request.pseudocode or registry_pseudocode

    question = request.question.strip()[:MAX_QUESTION_CHARS]
    if not question:
        # Not an error: the client disables the send button on an empty box,
        # so this only happens on whitespace, and a 422 for that would be a
        # worse experience than a nudge.
        return AskResponse(answer="Ask me anything about this algorithm and I will explain it.", ai_generated=False)

    prompt = ASK_USER_TEMPLATE.format(
        algorithm_context=algorithm_context,
        pseudocode=pseudocode,
        current_state=_format_state(request),
        conversation=_format_conversation(request),
        question=question,
    )

    try:
        result = await call_with_bounded_retry(
            lambda retry_reason: attempt_text(prompt, ASK_SYSTEM_PROMPT, retry_reason=retry_reason),
            lambda answer: _answer_failure(answer, pseudocode),
            label="ask",
        )
        # Diagnostics only; the api service does not forward headers.
        response.headers["X-AI-Outcome"] = "ai" if result.value is not None else "fallback"
        response.headers["X-AI-Attempts"] = str(result.attempts)
        response.headers["X-AI-Retry-Reason"] = result.retry_reason or "none"
        response.headers["X-AI-Failure-Reason"] = result.failure_reason or "none"
        response.headers["X-AI-Latency-Ms"] = str(result.latency_ms)
        response.headers["X-AI-Output-Tokens"] = str(result.output_tokens)
        if result.value is None:
            return AskResponse(
                answer=_deterministic_ask_answer(request, algorithm_context, pseudocode),
                ai_generated=False,
            )
        return AskResponse(answer=result.value)
    except Exception:
        logger.warning(
            "AI ask call failed for algorithm=%s, falling back to deterministic responder",
            request.algorithm_name,
            exc_info=True,
        )
        return AskResponse(
            answer=_deterministic_ask_answer(request, algorithm_context, pseudocode),
            ai_generated=False,
        )
