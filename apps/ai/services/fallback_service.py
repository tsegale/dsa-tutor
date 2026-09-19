from models.request_models import MisconceptionCategory, ScaffoldingLevel
from models.response_models import HintResponse, PredictionResponse

# Junction types that ask about an invariant or property of the whole
# structure rather than a single local comparison or selection - phrased
# differently in the neutral fallback so it never asks "which value is
# larger" for a step where no such comparison happened.
_INVARIANT_STYLE_JUNCTIONS = {
    "PASS_COMPLETE",
    "EARLY_TERMINATION",
    "ALGORITHM_COMPLETE",
    "AVL_BALANCE_CHECK",
    "RANGE_DOUBLE",
    "LOAD_FACTOR",
}

FALLBACK_EXPLANATION_TEMPLATE = (
    "Your answer does not match what {algorithm_name} does at this step. "
    "Compare it against the algorithm's rule for this situation and the "
    "exact values or state shown on screen."
)

FALLBACK_COUNTERFACTUAL_TEMPLATE = (
    "If this answer were applied, {algorithm_name} would deviate from its "
    "normal rule at this step, and the rest of the run would no longer "
    "match a correct execution."
)


def _neutral_hint(scaffolding_level: ScaffoldingLevel, algorithm_name: str, junction_type: str | None) -> str:
    is_invariant_style = junction_type in _INVARIANT_STYLE_JUNCTIONS
    subject = "the invariant this step relies on" if is_invariant_style else "the values or state just compared"

    if scaffolding_level == ScaffoldingLevel.HIGH:
        return f"Look again at {subject} in {algorithm_name} - what does the algorithm's rule say should happen?"
    if scaffolding_level == ScaffoldingLevel.LOW:
        return f"What invariant does {algorithm_name} need to maintain at this step?"
    if scaffolding_level == ScaffoldingLevel.NONE:
        return f"What is the correctness condition for this step of {algorithm_name}?"
    return f"What does {algorithm_name} require you to do at this step, based on {subject}?"


def get_fallback_prediction_response(
    correct: bool,
    scaffolding_level: ScaffoldingLevel,
    algorithm_name: str = "the algorithm",
    junction_type: str | None = None,
    ground_truth_misconception: MisconceptionCategory | None = None,
) -> PredictionResponse:
    return PredictionResponse(
        correct=correct,
        # The tile-derived (or rule-classified) ground truth still applies
        # even when the AI call itself failed - it never depended on the
        # model's response. ai_misconception_category is left null since no
        # usable AI guess exists for this submission.
        misconception_category=ground_truth_misconception,
        ai_misconception_category=None,
        consequence_explanation=FALLBACK_EXPLANATION_TEMPLATE.format(algorithm_name=algorithm_name),
        socratic_hint=_neutral_hint(scaffolding_level, algorithm_name, junction_type),
        xp_awarded=10 if correct else 0,
        counterfactual_trace=(
            "" if correct else FALLBACK_COUNTERFACTUAL_TEMPLATE.format(algorithm_name=algorithm_name)
        ),
        ai_generated=False,
    )


def get_fallback_hint(
    scaffolding_level: ScaffoldingLevel,
    algorithm_name: str = "the algorithm",
    junction_type: str | None = None,
) -> HintResponse:
    return HintResponse(
        hint=_neutral_hint(scaffolding_level, algorithm_name, junction_type),
        scaffolding_level=scaffolding_level,
        ai_generated=False,
    )
