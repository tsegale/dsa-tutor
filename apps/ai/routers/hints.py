from fastapi import APIRouter

from models.request_models import HintRequest
from models.response_models import HintResponse
from prompts.bubble_sort import BUBBLE_SORT_CONTEXT, BUBBLE_SORT_PSEUDOCODE
from prompts.templates import HINT_TEMPLATE
from services.claude_service import call_claude_for_text
from services.fallback_service import get_fallback_hint

router = APIRouter()


@router.post("/", response_model=HintResponse)
async def request_hint(request: HintRequest) -> HintResponse:
    prompt = HINT_TEMPLATE.format(
        algorithm_context=BUBBLE_SORT_CONTEXT,
        pseudocode=BUBBLE_SORT_PSEUDOCODE,
        step_index=request.step_index,
        current_prediction_prompt=request.current_prediction_prompt,
        error_history=request.error_history,
        scaffolding_level=request.scaffolding_level.value,
    )

    try:
        hint_text = await call_claude_for_text(prompt)
        return HintResponse(hint=hint_text, scaffolding_level=request.scaffolding_level)
    except Exception:
        return get_fallback_hint(request.scaffolding_level)
