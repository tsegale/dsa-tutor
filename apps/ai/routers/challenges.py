import json
import logging
import random

from fastapi import APIRouter
from pydantic import BaseModel

from services.claude_service import call_claude_for_feedback

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


CHALLENGE_PROMPT = """You are generating a targeted algorithmic challenge for a student learning {algorithm_name}.

Student profile:
- Top misconception: {top_misconception}
- Difficulty level: {difficulty}
- Recent performance: {session_history}

Generate an array of exactly {array_size} integers between 1 and 20 that will specifically target the student's weakness.

Rules for the array:
- If top_misconception is ORDER_OF_OPERATIONS: generate an array where many adjacent pairs need swapping, forcing the student to apply the comparison rule repeatedly
- If top_misconception is OFF_BY_ONE: generate an array where the boundary conditions are critical, for example the smallest or largest element is at an extreme position
- If top_misconception is STRUCTURAL_PROPERTY_VIOLATION: generate an array with many equal adjacent elements to test whether the student knows equal elements should not swap
- If top_misconception is null or unknown: generate a worst-case array for the algorithm (reverse sorted for Bubble Sort)
- For ADVANCED difficulty: include duplicates and near-sorted subsequences
- For BEGINNER difficulty: keep values spread apart to make comparisons visually obvious

Respond ONLY with valid JSON matching this exact schema:
{{
  "array": [<exactly {array_size} integers between 1 and 20>],
  "challenge_type": "<one of: worst_case | boundary_test | duplicate_heavy | near_sorted | adversarial>",
  "explanation": "<one sentence explaining why this array targets the student's weakness, for educator view only>",
  "hint_for_student": "<one sentence framing the challenge for the student without revealing the answer, e.g. Pay attention to what happens at the boundaries of each pass>"
}}

Return ONLY the JSON. No markdown, no explanation outside the JSON.
"""


@router.post("/", response_model=ChallengeResponse)
async def generate_challenge(request: ChallengeRequest) -> ChallengeResponse:
    prompt = CHALLENGE_PROMPT.format(
        algorithm_name=request.algorithm_name,
        top_misconception=request.top_misconception or "none identified yet",
        difficulty=request.difficulty,
        session_history=json.dumps(request.session_history),
        array_size=request.array_size,
    )
    try:
        data, _metadata = await call_claude_for_feedback(prompt)
        arr = data.get("array", [])
        # Validate: must be exactly the right size, all integers 1-20
        if len(arr) != request.array_size or not all(isinstance(x, int) and 1 <= x <= 20 for x in arr):
            raise ValueError(f"Invalid array from AI: {arr}")
        return ChallengeResponse(
            array=arr,
            challenge_type=data.get("challenge_type", "adversarial"),
            explanation=data.get("explanation", ""),
            hint_for_student=data.get("hint_for_student", ""),
        )
    except Exception as e:
        logger.warning(f"Challenge generation failed: {e}")
        fallback = sorted(
            random.sample(range(1, 21), min(request.array_size, 20)),
            reverse=True,
        )
        return ChallengeResponse(
            array=fallback,
            challenge_type="worst_case",
            explanation="Fallback: reverse-sorted array generated locally.",
            hint_for_student="This array will require the maximum number of comparisons.",
        )
