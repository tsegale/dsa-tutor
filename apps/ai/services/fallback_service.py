from models.request_models import ScaffoldingLevel
from models.response_models import HintResponse, PredictionResponse

FALLBACK_HINTS: dict[ScaffoldingLevel, str] = {
    ScaffoldingLevel.HIGH: "Which of the two highlighted values is larger — the one on the left or the one on the right?",
    ScaffoldingLevel.MEDIUM: "What does Bubble Sort require you to do when the left element is greater than the right?",
    ScaffoldingLevel.LOW: "What invariant does this comparison step need to maintain?",
    ScaffoldingLevel.NONE: "What is the correctness condition for a swap at this position?",
}

FALLBACK_EXPLANATION = (
    "Your choice would leave these two elements in the wrong order. "
    "On the next pass, Bubble Sort will have to revisit this same pair "
    "and the larger value will still need to move rightward, "
    "costing an extra comparison that could have been avoided here."
)

FALLBACK_COUNTERFACTUAL_TRACE = (
    "If this choice were applied, the two compared elements would stay "
    "in their current order. On the next comparison, the algorithm "
    "would carry that unresolved pair forward instead of making "
    "progress on this pass."
)


def get_fallback_prediction_response(correct: bool) -> PredictionResponse:
    return PredictionResponse(
        correct=correct,
        misconception_category=None,
        consequence_explanation=FALLBACK_EXPLANATION,
        socratic_hint=FALLBACK_HINTS[ScaffoldingLevel.MEDIUM],
        xp_awarded=10 if correct else 0,
        counterfactual_trace="" if correct else FALLBACK_COUNTERFACTUAL_TRACE,
    )


def get_fallback_hint(scaffolding_level: ScaffoldingLevel) -> HintResponse:
    return HintResponse(
        hint=FALLBACK_HINTS[scaffolding_level],
        scaffolding_level=scaffolding_level,
    )
