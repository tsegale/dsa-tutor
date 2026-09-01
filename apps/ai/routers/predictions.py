from typing import Any

from fastapi import APIRouter

from models.request_models import CriticalJunctionType, PredictionRequest
from models.response_models import PredictionResponse
from prompts.bubble_sort import (
    BUBBLE_SORT_CONTEXT,
    BUBBLE_SORT_PSEUDOCODE,
    CONCEPTUAL_JUNCTION_CORRECT_OPTION_IDS,
    CRITICAL_JUNCTION_GUIDANCE,
)
from prompts.templates import FEEDBACK_TEMPLATE
from services.claude_service import call_claude_for_feedback
from services.fallback_service import get_fallback_prediction_response
from services.misconception_classifier import classify_bubble_sort_misconception

router = APIRouter()


def evaluate_bubble_sort_answer(request: PredictionRequest) -> bool:
    state = request.current_state
    if not isinstance(state, dict) or request.student_answer is None:
        return False

    active_indices = state.get("activeIndices") or []
    data = state.get("dataStructureState")

    if len(active_indices) != 2 or not isinstance(data, list):
        return False

    left_index, right_index = active_indices[0], active_indices[1]
    if left_index >= len(data) or right_index >= len(data):
        return False

    left_value, right_value = data[left_index], data[right_index]
    should_swap = left_value > right_value

    answer = request.student_answer.strip().lower()

    if answer in ("swap", "swap them", "no-swap", "no swap needed"):
        said_swap = answer in ("swap", "swap them")
        return said_swap == should_swap

    try:
        answered_index = int(answer)
    except ValueError:
        return False

    larger_index = left_index if left_value > right_value else right_index
    return answered_index == larger_index


def evaluate_conceptual_junction_answer(request: PredictionRequest) -> bool:
    """PASS_COMPLETE / EARLY_TERMINATION / ALGORITHM_COMPLETE correctness
    is a fixed property of the algorithm's invariants, not the current
    array values, so it's just an option-id comparison."""
    if request.junction_type is None or request.student_answer is None:
        return False
    correct_id = CONCEPTUAL_JUNCTION_CORRECT_OPTION_IDS.get(request.junction_type.value)
    return correct_id is not None and request.student_answer.strip() == correct_id


def evaluate_answer(request: PredictionRequest) -> bool:
    if request.junction_type is not None and request.junction_type != CriticalJunctionType.SWAP_DECISION:
        return evaluate_conceptual_junction_answer(request)
    return evaluate_bubble_sort_answer(request)


@router.post("/", response_model=PredictionResponse)
async def submit_prediction(request: PredictionRequest) -> PredictionResponse:
    correct = evaluate_answer(request)

    junction_type = request.junction_type.value if request.junction_type else CriticalJunctionType.SWAP_DECISION.value
    junction_difficulty = request.junction_difficulty.value if request.junction_difficulty else "PROCEDURAL"

    prompt = FEEDBACK_TEMPLATE.format(
        algorithm_context=BUBBLE_SORT_CONTEXT,
        pseudocode=BUBBLE_SORT_PSEUDOCODE,
        step_index=request.step_index,
        current_state=request.current_state,
        student_answer=request.student_answer,
        correct="correct" if correct else "incorrect",
        error_history=request.error_history,
        scaffolding_level=request.scaffolding_level.value,
        junction_type=junction_type,
        junction_difficulty=junction_difficulty,
        junction_guidance=CRITICAL_JUNCTION_GUIDANCE.get(junction_type, ""),
    )

    try:
        feedback: dict[str, Any] = await call_claude_for_feedback(prompt)
        misconception = classify_bubble_sort_misconception(
            request.student_answer,
            request.current_state,
            feedback.get("misconception_category"),
        )
        return PredictionResponse(
            correct=correct,
            misconception_category=misconception,
            consequence_explanation=feedback["consequence_explanation"],
            socratic_hint=feedback["socratic_hint"],
            xp_awarded=feedback.get("xp_awarded", 10 if correct else 0),
            counterfactual_trace="" if correct else feedback.get("counterfactual_trace", ""),
        )
    except Exception:
        return get_fallback_prediction_response(correct)
