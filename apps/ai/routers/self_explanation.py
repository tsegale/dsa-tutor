import logging
import re

from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.response_models import CamelModel
from prompts.templates import PROMPT_VERSION, SELF_EXPLANATION_SYSTEM_PROMPT, SELF_EXPLANATION_USER_TEMPLATE
from services.claude_service import attempt_feedback, call_with_bounded_retry, field_failure, model_name

router = APIRouter(prefix="/self-explanations", tags=["self-explanations"])
logger = logging.getLogger(__name__)


class RubricCriterion(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    criterion: str = Field(min_length=1, max_length=400)


class SelfExplanationRequest(BaseModel):
    algorithm_name: str
    prompt_key: str
    question: str
    rubric: list[RubricCriterion] = Field(min_length=2, max_length=3)
    student_response: str


class CriterionResult(CamelModel):
    id: str
    met: bool


class SelfExplanationResponse(CamelModel):
    # Null when the model's judgement failed validation: a fallback never
    # invents criterion results, so the research data can tell "not met"
    # from "not evaluated".
    results: list[CriterionResult] | None
    score: int | None
    acknowledgement: str
    follow_up_question: str | None
    ai_generated: bool
    failure_reason: str | None = None
    prompt_version: str = PROMPT_VERSION
    ai_model: str | None = None


# Anything that reads as a grade: "7/10", "80%", "out of", "score", "points".
_GRADE_PATTERN = re.compile(r"\d+\s*/\s*\d+|\d+\s*%|\bout of\b|\bscore\b|\bpoints?\b|\bgrade\b", re.IGNORECASE)

FALLBACK_ACKNOWLEDGEMENT = "Thanks - keep that reasoning in mind as the run continues."


def _failure(feedback: dict | None, rubric_ids: list[str]) -> str | None:
    """Names the first rule a self-explanation judgement breaks, or None."""
    if feedback is None:
        return "json_parse"
    if not isinstance(feedback, dict):
        return "json_shape"
    criteria = feedback.get("criteria")
    if not isinstance(criteria, dict) or set(criteria) != set(rubric_ids):
        return "criteria.ids"
    if not all(isinstance(value, bool) for value in criteria.values()):
        return "criteria.type"
    acknowledgement = feedback.get("acknowledgement")
    why = field_failure(acknowledgement, max_sentences=1)
    if why:
        return f"acknowledgement.{why}"
    if _GRADE_PATTERN.search(acknowledgement):
        return "acknowledgement.grade"
    follow_up = feedback.get("follow_up_question")
    if follow_up is not None:
        why = field_failure(follow_up, max_words=25)
        if why:
            return f"follow_up_question.{why}"
        if not follow_up.strip().endswith("?") or follow_up.count("?") != 1:
            return "follow_up_question.not_one_question"
        if _GRADE_PATTERN.search(follow_up):
            return "follow_up_question.grade"
    return None


def _score(results: list[CriterionResult]) -> int:
    """Percentage of criteria met - computed here, never by the model."""
    return round(100 * sum(result.met for result in results) / len(results))


def _fallback(failure_reason: str) -> SelfExplanationResponse:
    return SelfExplanationResponse(
        results=None,
        score=None,
        acknowledgement=FALLBACK_ACKNOWLEDGEMENT,
        follow_up_question=None,
        ai_generated=False,
        failure_reason=failure_reason,
        ai_model=model_name,
    )


@router.post("", response_model=SelfExplanationResponse)
async def evaluate_self_explanation(request: SelfExplanationRequest) -> SelfExplanationResponse:
    rubric_ids = [item.id for item in request.rubric]
    prompt = SELF_EXPLANATION_USER_TEMPLATE.format(
        algorithm_name=request.algorithm_name,
        question=request.question,
        rubric="\n".join(f"{item.id}: {item.criterion}" for item in request.rubric),
        student_response=request.student_response,
    )
    try:
        result = await call_with_bounded_retry(
            lambda retry_reason: attempt_feedback(
                prompt, SELF_EXPLANATION_SYSTEM_PROMPT, retry_reason=retry_reason, token_limit=300
            ),
            lambda feedback: _failure(feedback, rubric_ids),
            label="self_explanation",
        )
    except Exception:
        logger.warning("AI self-explanation call failed for prompt_key=%s, falling back", request.prompt_key, exc_info=True)
        return _fallback("error")

    if result.value is None:
        return _fallback(result.failure_reason or "invalid")

    criteria = result.value["criteria"]
    results = [CriterionResult(id=criterion_id, met=criteria[criterion_id]) for criterion_id in rubric_ids]
    return SelfExplanationResponse(
        results=results,
        score=_score(results),
        acknowledgement=result.value["acknowledgement"].strip(),
        follow_up_question=(result.value.get("follow_up_question") or None),
        ai_generated=True,
        ai_model=model_name,
    )
