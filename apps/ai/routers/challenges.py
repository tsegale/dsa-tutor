import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.claude_service import call_claude_for_text

router = APIRouter(prefix="/challenges", tags=["challenges"])
logger = logging.getLogger(__name__)


class ChallengeRequest(BaseModel):
    algorithm_name: str
    top_misconception: str | None
    difficulty: str  # BEGINNER | INTERMEDIATE | ADVANCED
    session_history: dict  # summary of recent performance
    array_size: int = 7


class ChallengeResponse(BaseModel):
    array: list[int]
    challenge_type: str
    explanation: str  # why this array was chosen, shown to educator, not student
    hint_for_student: str  # one sentence framing the challenge without spoiling it


# Only Bubble Sort has a real generator - AI Challenge is hidden in the UI
# for every other algorithm (see hasChallengeGenerator in
# apps/web/src/utils/challengeGenerators.ts) rather than silently loading
# a 7-integer array that means nothing for a tree, graph or trie topic.
SUPPORTED_ALGORITHMS = {"bubble_sort", "bubble sort"}


def _normalize(algorithm_name: str) -> str:
    return algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


def _difficulty_value_range(difficulty: str) -> tuple[int, int]:
    if difficulty == "ADVANCED":
        return 1, 12
    if difficulty == "BEGINNER":
        return 1, 40
    return 1, 20


def _order_of_operations_array(size: int, low: int, high: int) -> list[int]:
    # ORDER_OF_OPERATIONS is over-swapping: the student swaps pairs that
    # were already in the correct order. Remediation needs the OPPOSITE
    # of what the old (inverted) prompt asked for: many adjacent pairs
    # that must NOT be swapped, so "leave it" is drilled repeatedly. A
    # strictly ascending run does exactly that.
    step = max(1, (high - low) // max(size, 1))
    return [low + i * step for i in range(size)]


def _structural_property_violation_array(size: int, low: int, high: int) -> list[int]:
    # STRUCTURAL_PROPERTY_VIOLATION is under-swapping: the student fails
    # to swap a genuinely out-of-order pair. The old prompt generated
    # equal-heavy arrays instead - reinforcing "leave it" is the same
    # habit that causes this misconception, not a fix for it. Reverse
    # sorted maximises the number of pairs that genuinely need a swap.
    step = max(1, (high - low) // max(size, 1))
    return [high - i * step for i in range(size)]


def _comparison_direction_array(size: int, low: int, high: int) -> list[int]:
    # Alternating just-above/just-below values force a real side-by-side
    # comparison at every step, rather than an obvious gap either side
    # could be judged as "of course" without checking the direction.
    mid = (low + high) // 2
    return [mid + (1 if i % 2 == 0 else -1) * (i // 2 + 1) for i in range(size)]


def _off_by_one_array(size: int, low: int, high: int) -> list[int]:
    # Boundary conditions are the point: force the extreme values to sit
    # at the extreme positions, so every pass's boundary handling matters.
    if size <= 1:
        return [low] * size
    span = max(1, high - low)
    middle = [low + 1 + ((i * span) // size) for i in range(size - 2)]
    return [high, *middle, low]


def _premature_termination_array(size: int, low: int, high: int) -> list[int]:
    # Almost sorted, but with one element out of place near the end -
    # tempts an early-termination call before the array is actually done.
    values = list(range(low, low + size))
    if size >= 2:
        values[-1], values[-2] = values[-2], values[-1]
    return values


def _worst_case_array(size: int, low: int, high: int) -> list[int]:
    step = max(1, (high - low) // max(size, 1))
    return [high - i * step for i in range(size)]


# Generators keyed by the exact MisconceptionCategory values (see
# packages/types/index.ts and apps/ai/models/request_models.py) that
# correspond to an observable array-shape property for a sorting
# algorithm. Categories with no such correspondence (e.g.
# TRAVERSAL_ORDER_CONFUSION, POINTER_CONFUSION) fall through to the
# worst-case default, matching the original prompt's own stated fallback.
_GENERATORS = {
    "ORDER_OF_OPERATIONS": (_order_of_operations_array, "near_sorted"),
    "STRUCTURAL_PROPERTY_VIOLATION": (_structural_property_violation_array, "worst_case"),
    "COMPARISON_DIRECTION": (_comparison_direction_array, "adversarial"),
    "OFF_BY_ONE": (_off_by_one_array, "boundary_test"),
    "PREMATURE_TERMINATION": (_premature_termination_array, "near_sorted"),
}

_EXPLANATIONS = {
    "ORDER_OF_OPERATIONS": (
        "Student over-swaps (swaps pairs already in order). Array is strictly ascending so every "
        "adjacent pair drills the correct 'leave it' decision."
    ),
    "STRUCTURAL_PROPERTY_VIOLATION": (
        "Student under-swaps (fails to swap out-of-order pairs). Array is reverse sorted, maximising "
        "how many pairs genuinely need a swap."
    ),
    "COMPARISON_DIRECTION": (
        "Student misjudges comparison direction. Values alternate just above and below the midpoint "
        "so every comparison requires an actual check, not a guess from an obvious gap."
    ),
    "OFF_BY_ONE": (
        "Student makes boundary/index errors. Extreme values are placed at extreme positions so "
        "every pass's boundary handling is exercised."
    ),
    "PREMATURE_TERMINATION": (
        "Student stops the algorithm too early. Array is almost sorted with one pair out of place "
        "near the end, tempting an early-termination call before the array is actually done."
    ),
    None: "No misconception identified yet - generated a worst-case (reverse sorted) array.",
}


def generate_challenge_array(
    top_misconception: str | None, difficulty: str, array_size: int
) -> tuple[list[int], str, str]:
    """Deterministic, rule-based array generation - provably on-target for
    the chosen misconception, unlike an LLM asked to produce integers,
    and free of the LLM's variable latency/cost for a task that has one
    correct shape per misconception."""
    low, high = _difficulty_value_range(difficulty)
    size = max(1, array_size)

    generator_entry = _GENERATORS.get(top_misconception or "")
    if generator_entry is None:
        array = _worst_case_array(size, low, high)
        challenge_type = "worst_case"
    else:
        generator, challenge_type = generator_entry
        array = generator(size, low, high)

    if difficulty == "ADVANCED" and len(array) >= 2:
        # Duplicates and a near-sorted subsequence, per the original
        # difficulty rules - applied after the misconception-targeted
        # shape rather than replacing it.
        array[len(array) // 2] = array[0]

    explanation = _EXPLANATIONS.get(top_misconception, _EXPLANATIONS[None])
    return array, challenge_type, explanation


HINT_PROMPT = """You are a Socratic tutor. A student is about to attempt a Bubble Sort
challenge array specifically chosen to target their weakness: {explanation}

Write ONE sentence framing the challenge for the student, without revealing
the answer or naming their misconception outright. Example style: "Pay
attention to what happens at the boundaries of each pass."

Respond with plain text only, no markdown, no JSON."""


@router.post("/", response_model=ChallengeResponse)
async def generate_challenge(request: ChallengeRequest) -> ChallengeResponse:
    if _normalize(request.algorithm_name) not in SUPPORTED_ALGORITHMS:
        # Defensive: the frontend should never call this for an
        # unsupported algorithm (see hasChallengeGenerator), but never
        # silently generate a meaningless plain-integer array for a tree,
        # graph or trie topic if it somehow does.
        raise ValueError(f"No challenge generator for algorithm: {request.algorithm_name}")

    array, challenge_type, explanation = generate_challenge_array(
        request.top_misconception, request.difficulty, request.array_size
    )

    try:
        hint_prompt = HINT_PROMPT.format(explanation=explanation)
        hint_for_student, _metadata = await call_claude_for_text(hint_prompt)
    except Exception as e:
        logger.warning(f"Challenge hint generation failed: {e}")
        hint_for_student = "Watch closely how the algorithm handles this array - it was chosen to test a specific habit."

    return ChallengeResponse(
        array=array,
        challenge_type=challenge_type,
        explanation=explanation,
        hint_for_student=hint_for_student,
    )
