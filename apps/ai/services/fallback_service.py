from models.request_models import ScaffoldingLevel
from models.response_models import HintResponse, PredictionResponse

FALLBACK_HINTS: dict[ScaffoldingLevel, str] = {
    ScaffoldingLevel.HIGH: (
        "Compare the two highlighted values directly: is the left one "
        "greater than the right one? If so, they need to swap."
    ),
    ScaffoldingLevel.MEDIUM: (
        "Look at the two highlighted values. Which one is larger, and "
        "where should the larger value end up?"
    ),
    ScaffoldingLevel.LOW: "What does Bubble Sort do when two adjacent elements are out of order?",
    ScaffoldingLevel.NONE: "Look closely at the highlighted elements.",
}

FALLBACK_EXPLANATION = (
    "The AI tutor is temporarily unavailable, so here is a general check: "
    "in Bubble Sort, adjacent elements are swapped whenever the left one "
    "is greater than the right one."
)


def get_fallback_prediction_response(correct: bool) -> PredictionResponse:
    return PredictionResponse(
        correct=correct,
        misconception_category=None,
        consequence_explanation=FALLBACK_EXPLANATION,
        socratic_hint=FALLBACK_HINTS[ScaffoldingLevel.MEDIUM],
        xp_awarded=10 if correct else 0,
    )


def get_fallback_hint(scaffolding_level: ScaffoldingLevel) -> HintResponse:
    return HintResponse(
        hint=FALLBACK_HINTS[scaffolding_level],
        scaffolding_level=scaffolding_level,
    )
