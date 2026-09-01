from typing import Any

from fastapi import APIRouter

from models.request_models import PredictionRequest
from models.response_models import PredictionResponse
from prompts.bubble_sort import BUBBLE_SORT_CONTEXT, BUBBLE_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
from prompts.templates import FEEDBACK_TEMPLATE
from services.claude_service import call_claude_for_feedback
from services.fallback_service import get_fallback_prediction_response
from services.misconception_classifier import classify_bubble_sort_misconception

router = APIRouter()


def evaluate_bubble_sort_answer(request: PredictionRequest) -> bool:
    state = request.current_state
    if not state or not isinstance(state, dict):
        return False

    junction_type = state.get("criticalJunctionType")

    # SWAP_DECISION: compare left and right values
    if junction_type == "SWAP_DECISION":
        active = state.get("activeIndices") or []
        arr = state.get("dataStructureState") or []
        if len(active) != 2 or not arr or max(active) >= len(arr):
            return False
        should_swap = arr[active[0]] > arr[active[1]]
        if request.student_answer == "swap":
            return should_swap
        if request.student_answer == "no-swap":
            return not should_swap
        return False

    # Conceptual junctions: correct tile id is always 'correct'
    if junction_type in ("PASS_COMPLETE", "EARLY_TERMINATION", "ALGORITHM_COMPLETE"):
        return request.student_answer == "correct"

    return False


def build_comparison_context(junction_type: str, state: dict, student_answer: str | None) -> str:
    """SWAP_DECISION only: names the exact values on screen so Claude's
    feedback is grounded in what the student actually saw, not generic."""
    if junction_type != "SWAP_DECISION":
        return ""

    active = state.get("activeIndices") or []
    arr = state.get("dataStructureState") or []
    if len(active) != 2 or not arr:
        return ""

    left_val = arr[active[0]]
    right_val = arr[active[1]]
    should_swap = left_val > right_val
    return (
        f"The algorithm compared index {active[0]} (value {left_val}) "
        f"with index {active[1]} (value {right_val}). "
        f'The correct action was {"swap" if should_swap else "no swap"} '
        f'because {left_val} {">" if should_swap else "<="} {right_val}. '
        f"The student chose: {student_answer}."
    )


@router.post("/", response_model=PredictionResponse)
async def submit_prediction(request: PredictionRequest) -> PredictionResponse:
    correct = evaluate_bubble_sort_answer(request)

    state = request.current_state if isinstance(request.current_state, dict) else {}
    junction_type = state.get("criticalJunctionType") or (
        request.junction_type.value if request.junction_type else "SWAP_DECISION"
    )
    junction_difficulty = request.junction_difficulty.value if request.junction_difficulty else "PROCEDURAL"
    comparison_context = build_comparison_context(junction_type, state, request.student_answer)

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
        comparison_context=comparison_context,
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
