import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.claude_service import call_claude_for_feedback

router = APIRouter(prefix="/feynman", tags=["feynman"])
logger = logging.getLogger(__name__)


class FeynmanRequest(BaseModel):
    algorithm_name: str
    algorithm_context: str
    student_explanation: str
    completion_context: str  # what the student just completed, e.g. 'full Bubble Sort on [5,3,1,4,2]'
    session_id: str


class FeynmanResponse(BaseModel):
    score: int
    feedback_summary: str
    follow_up_question: str | None
    missing_concepts: list[str]
    is_complete: bool  # true if explanation is sufficient, no follow-up needed


# Grading criteria for the model (internal) alongside a short, plain-English
# label for the same concept (shown to the student verbatim in "Concepts to
# review" if the model doesn't explicitly restate it - see FEYNMAN_PROMPT's
# missing_concepts instruction). Keep both in sync: the label must name the
# same idea as the criterion, just phrased for a student, not a rubric.
FEYNMAN_RUBRIC = {
    "bubble_sort": [
        ("mentions comparison of adjacent elements", "Comparing adjacent elements"),
        ("explains the swap condition (left greater than right)", "When a swap happens (left bigger than right)"),
        ("describes the pass structure (multiple passes)", "Making multiple passes over the array"),
        (
            "mentions that the largest unsorted element reaches its final position after each pass",
            "Why the largest unsorted value settles into place each pass",
        ),
        ("explains the early termination optimisation", "Stopping early once a pass makes no swaps"),
    ]
}

FEYNMAN_PROMPT = """You are playing the role of a curious but confused beginner student who has never seen {algorithm_name} before.

A peer student just explained {algorithm_name} to you after completing this exercise: {completion_context}

Their explanation was:
"{student_explanation}"

You must evaluate their explanation against this rubric of key concepts:
{rubric}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "score": <integer 0-100 based on how many rubric concepts were clearly explained>,
  "feedback_summary": "<2-3 sentences of feedback written as the confused beginner student, praising what was clear and noting what confused you. Use first person, conversational, not academic>",
  "follow_up_question": "<a single follow-up question you still have as the confused beginner, targeting the most important missing concept. null if the explanation covered everything>",
  "missing_concepts": ["<concept 1>", "<concept 2>"],
  "is_complete": <true if score >= 75 and no critical concepts are missing, false otherwise>
}}

The feedback_summary and follow_up_question must sound like a real confused student, not a teacher or AI.
Example feedback_summary: "Ok that mostly made sense! I get that you swap them if the left one is bigger. But I am confused, do you always have to go through the whole list every time? What happens if it is already sorted?"
Example follow_up_question: "So after one full pass, does that mean the entire list is sorted or just part of it?"

For "missing_concepts", use ONLY the exact concept label given in parentheses
next to each rubric line above - never invent your own phrasing and never
copy the grading criterion text itself. These labels are shown directly to
the student, so they must read like a short topic, not an evaluator's
internal note.
"""

DEFAULT_RUBRIC = [
    ("explains the core algorithm logic", "The core algorithm logic"),
    ("describes the step sequence", "The step-by-step sequence"),
    ("mentions the termination condition", "When the algorithm stops"),
]


@router.post("/", response_model=FeynmanResponse)
async def evaluate_feynman(request: FeynmanRequest) -> FeynmanResponse:
    rubric = FEYNMAN_RUBRIC.get(request.algorithm_name.lower().replace(" ", "_"), DEFAULT_RUBRIC)
    rubric_text = "\n".join(f'- {criterion} (concept label: "{label}")' for criterion, label in rubric)

    prompt = FEYNMAN_PROMPT.format(
        algorithm_name=request.algorithm_name,
        completion_context=request.completion_context,
        student_explanation=request.student_explanation,
        rubric=rubric_text,
    )

    try:
        data = await call_claude_for_feedback(prompt)
        return FeynmanResponse(
            score=data.get("score", 0),
            feedback_summary=data.get("feedback_summary", ""),
            follow_up_question=data.get("follow_up_question"),
            missing_concepts=data.get("missing_concepts", []),
            is_complete=data.get("is_complete", False),
        )
    except Exception as e:
        logger.warning(f"Feynman evaluation failed: {e}")
        return FeynmanResponse(
            score=0,
            feedback_summary="I could not understand your explanation. Could you try again?",
            follow_up_question="Can you explain it again from the beginning?",
            missing_concepts=[],
            is_complete=False,
        )
