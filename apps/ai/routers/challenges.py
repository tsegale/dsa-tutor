import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.response_models import CamelModel
from prompts.templates import CHALLENGE_FRAMING_SYSTEM_PROMPT, CHALLENGE_FRAMING_USER_TEMPLATE, PROMPT_VERSION
from services.claude_service import call_claude_for_text, field_failure, model_name

router = APIRouter(prefix="/challenges", tags=["challenges"])
logger = logging.getLogger(__name__)

# Challenge data is generated deterministically on the web client (apps/web/
# src/utils/challengeGenerators.ts), one generator per study-topic structure.
# The model never sees or produces the data: it only writes the one framing
# sentence shown to the student, from the case's authored explanation.
SUPPORTED_ALGORITHMS = {"bubble_sort", "binary_search", "bst", "binary_search_tree"}

_MAX_WORDS = 25


class ChallengeFramingRequest(BaseModel):
    algorithm_name: str
    case_id: str = Field(min_length=1, max_length=60)
    case_explanation: str = Field(min_length=1, max_length=600)


class ChallengeFramingResponse(CamelModel):
    # Null when the call failed or the sentence failed validation: the client
    # then shows the case's own authored fallback sentence.
    hint_for_student: str | None
    ai_generated: bool
    failure_reason: str | None = None
    prompt_version: str = PROMPT_VERSION
    ai_model: str | None = None


def _normalize(algorithm_name: str) -> str:
    return algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


def framing_failure(text: str | None) -> str | None:
    """Names the first rule a framing sentence breaks, or None."""
    why = field_failure(text, max_sentences=1, max_words=_MAX_WORDS)
    if why:
        return why
    # A digit can only have come from somewhere other than the data (the
    # model never sees it), so it is an invented value - never shown.
    if any(ch.isdigit() for ch in text or ""):
        return "digit"
    return None


@router.post("/", response_model=ChallengeFramingResponse)
async def frame_challenge(request: ChallengeFramingRequest) -> ChallengeFramingResponse:
    if _normalize(request.algorithm_name) not in SUPPORTED_ALGORITHMS:
        # Defensive: the frontend hides AI Challenge on topics without a
        # generator (hasChallengeGenerator), so this is never a real request.
        return ChallengeFramingResponse(hint_for_student=None, ai_generated=False, failure_reason="unsupported_algorithm")

    prompt = CHALLENGE_FRAMING_USER_TEMPLATE.format(
        algorithm_name=request.algorithm_name,
        case_explanation=request.case_explanation,
    )
    try:
        text, _metadata = await call_claude_for_text(prompt, CHALLENGE_FRAMING_SYSTEM_PROMPT)
    except Exception as e:
        logger.warning(f"Challenge framing failed: {e}")
        return ChallengeFramingResponse(hint_for_student=None, ai_generated=False, failure_reason="error")

    why = framing_failure(text)
    if why:
        logger.warning(f"Challenge framing failed validation: {why}")
        return ChallengeFramingResponse(hint_for_student=None, ai_generated=False, failure_reason=why)
    return ChallengeFramingResponse(hint_for_student=text.strip(), ai_generated=True, ai_model=model_name)
