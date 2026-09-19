import logging
from typing import Any

from fastapi import APIRouter

from models.request_models import HintRequest
from models.response_models import HintResponse
from prompts.registry import get_algorithm_context
from prompts.templates import HINT_SYSTEM_PROMPT, HINT_USER_TEMPLATE
from services.claude_service import call_claude_for_text, is_field_valid
from services.fallback_service import get_fallback_hint

router = APIRouter()
logger = logging.getLogger(__name__)


def _extract_comparison_pair(current_state: Any) -> tuple[int, Any, int, Any] | None:
    """Only handles the shape used by array-comparison junctions where
    dataStructureState is the bare array and activeIndices names the two
    indices under comparison (e.g. Bubble Sort's SWAP_DECISION) - this is
    exactly the shape the reported hint bug (index 0 credited with two
    different values) came from. Other junction shapes fall back to no
    structured grounding rather than guessing at an unverified layout."""
    if not isinstance(current_state, dict):
        return None
    ds = current_state.get("dataStructureState")
    active = current_state.get("activeIndices")
    if not isinstance(ds, list) or not isinstance(active, list) or len(active) != 2:
        return None
    i, j = active
    if not isinstance(i, int) or not isinstance(j, int):
        return None
    if i < 0 or j < 0 or i >= len(ds) or j >= len(ds):
        return None
    return i, ds[i], j, ds[j]


@router.post("/", response_model=HintResponse)
async def request_hint(request: HintRequest) -> HintResponse:
    algorithm_context, pseudocode, _ = get_algorithm_context(request.algorithm_name)
    junction_type = (
        request.current_state.get("criticalJunctionType") if isinstance(request.current_state, dict) else None
    )

    comparison_pair = _extract_comparison_pair(request.current_state)
    if comparison_pair:
        left_index, left_value, right_index, right_value = comparison_pair
        comparison_values = (
            f"index {left_index} holds value {left_value}; index {right_index} holds value {right_value}. "
            "These are the ONLY two index/value pairs in play - do not invent, merge, or swap them."
        )
    else:
        comparison_values = "Not applicable for this step - rely on the prediction prompt above instead."

    prompt = HINT_USER_TEMPLATE.format(
        algorithm_context=algorithm_context,
        pseudocode=pseudocode,
        step_index=request.step_index,
        current_prediction_prompt=request.current_prediction_prompt,
        comparison_values=comparison_values,
        error_history=request.error_history,
        scaffolding_level=request.scaffolding_level.value,
    )

    try:
        hint_text, metadata = await call_claude_for_text(prompt, system=HINT_SYSTEM_PROMPT)
        logger.info(
            "AI hint call: latency_ms=%s input_tokens=%s output_tokens=%s",
            metadata.latency_ms,
            metadata.input_tokens,
            metadata.output_tokens,
        )
        if not is_field_valid(hint_text, max_words=20):
            logger.warning("AI hint failed validation, retrying once")
            hint_text, metadata = await call_claude_for_text(prompt, system=HINT_SYSTEM_PROMPT)
            logger.info(
                "AI hint retry call: latency_ms=%s input_tokens=%s output_tokens=%s",
                metadata.latency_ms,
                metadata.input_tokens,
                metadata.output_tokens,
            )
            if not is_field_valid(hint_text, max_words=20):
                logger.warning("AI hint failed validation again, falling back")
                return get_fallback_hint(request.scaffolding_level, request.algorithm_name, junction_type)
        return HintResponse(hint=hint_text, scaffolding_level=request.scaffolding_level)
    except Exception:
        logger.warning(
            "AI hint call failed for algorithm=%s junction_type=%s step_index=%s, falling back",
            request.algorithm_name,
            junction_type,
            request.step_index,
            exc_info=True,
        )
        return get_fallback_hint(request.scaffolding_level, request.algorithm_name, junction_type)
