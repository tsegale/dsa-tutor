import logging
import re

from fastapi import APIRouter
from pydantic import BaseModel

from prompts.registry import get_algorithm_context
from services.claude_service import call_claude_for_feedback

router = APIRouter(prefix="/feynman", tags=["feynman"])
logger = logging.getLogger(__name__)


class FeynmanRequest(BaseModel):
    algorithm_name: str
    algorithm_context: str
    student_explanation: str
    completion_context: str  # what the student just completed, e.g. 'full Bubble Sort on [5,3,1,4,2]'
    session_id: str
    # Every narration description the student has seen so far this run
    # (see StepLog in apps/web/src/components/layout/StepLog.tsx). Used
    # only for the anti-gaming overlap check below - never fed back to
    # the model as part of the grading prompt.
    step_descriptions: list[str] = []


class FeynmanRubricItemResult(BaseModel):
    concept_label: str
    met: bool


class FeynmanResponse(BaseModel):
    score: int
    feedback_summary: str
    follow_up_question: str | None
    missing_concepts: list[str]
    is_complete: bool  # true if explanation is sufficient, no follow-up needed
    # Per-concept results behind the score, so which concepts students
    # most often omit can be reported rather than just an aggregate number.
    rubric_results: list[FeynmanRubricItemResult] = []


def _normalize(algorithm_name: str) -> str:
    # Matches prompts/registry.py's get_algorithm_context normalisation,
    # so a rubric and an algorithm context always resolve for the same
    # set of display-name spellings.
    return algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


# Grading criteria for the model (internal) alongside a short, plain-English
# label for the same concept (shown to the student verbatim in "Concepts to
# review" if the model doesn't explicitly restate it - see FEYNMAN_PROMPT's
# rubric_results instruction). Keep both in sync: the label must name the
# same idea as the criterion, just phrased for a student, not a rubric.
#
# Only algorithms listed here have a real, comparable rubric - Feynman Mode
# is restricted to these in the UI (see
# apps/web/src/utils/feynmanRubrics.ts) rather than falling back to the
# generic three-item rubric below, which would produce scores that aren't
# comparable across topics.
FEYNMAN_RUBRIC: dict[str, list[tuple[str, str]]] = {
    "bubble_sort": [
        ("mentions comparison of adjacent elements", "Comparing adjacent elements"),
        ("explains the swap condition (left greater than right)", "When a swap happens (left bigger than right)"),
        ("describes the pass structure (multiple passes)", "Making multiple passes over the array"),
        (
            "mentions that the largest unsorted element reaches its final position after each pass",
            "Why the largest unsorted value settles into place each pass",
        ),
        ("explains the early termination optimisation", "Stopping early once a pass makes no swaps"),
    ],
    "selection_sort": [
        ("mentions scanning the unsorted region for the minimum element", "Scanning for the minimum element"),
        ("explains that the minimum is swapped to the front of the unsorted region", "Swapping the minimum into place"),
        ("describes that the sorted region grows from the front", "The sorted region growing from the front"),
        ("mentions that a full scan happens every pass regardless of order", "Always scanning to the end, even if already sorted"),
    ],
    "insertion_sort": [
        ("mentions building the sorted region one element at a time", "Building the sorted region one element at a time"),
        ("explains shifting larger elements right to make room", "Shifting larger elements right to make room"),
        ("mentions comparing the key against the sorted region to its left", "Comparing the key against the sorted elements to its left"),
        ("explains why it stops shifting once a smaller (or equal) element is found", "Stopping the shift once a smaller element is found"),
    ],
    "merge_sort": [
        ("describes recursively dividing the array in half", "Recursively dividing the array in half"),
        ("mentions a base case of a single element (or empty array)", "The base case: an array of one element is already sorted"),
        ("explains merging two sorted halves by comparing their front elements", "Merging two sorted halves by comparing front elements"),
        ("mentions that merge sort is not in-place (uses extra memory)", "Needing extra memory for the merge step"),
    ],
    "quick_sort": [
        ("mentions choosing a pivot element", "Choosing a pivot"),
        ("explains partitioning elements smaller/larger than the pivot", "Partitioning around the pivot"),
        ("mentions that the pivot ends up in its final sorted position after partitioning", "The pivot landing in its final position"),
        ("describes recursing on the two partitions", "Recursing on the left and right partitions"),
    ],
    "linear_search": [
        ("mentions checking each element one at a time from the start", "Checking each element one at a time"),
        ("explains stopping as soon as a match is found", "Stopping as soon as a match is found"),
        ("mentions that it works on unsorted data", "Working even on unsorted data"),
    ],
    "binary_search": [
        ("mentions that the array must be sorted", "Requiring a sorted array"),
        ("explains comparing the target against the middle element", "Comparing the target against the middle element"),
        ("describes halving the search space based on that comparison", "Halving the search space each step"),
        ("mentions the search ends when the target is found or the range is empty", "Stopping when found or the range is empty"),
    ],
}

# BFS/DFS/BST's seeded slugs ("bfs", "dfs", "bst") don't normalise to the
# same string as their display names ("Breadth-First Search", etc. -
# _normalize("Breadth-First Search") is "breadth_first_search", not "bfs"),
# and the display name is what's actually sent at runtime (see
# useAlgorithmStore's algorithmName). Registered under both forms, the
# same defensive pattern prompts/registry.py's get_algorithm_context
# already uses for these exact three.
_BFS_RUBRIC = [
    ("mentions using a queue (FIFO)", "Using a queue (first-in, first-out)"),
    ("explains visiting nodes level by level", "Visiting nodes level by level"),
    ("mentions marking nodes visited to avoid revisiting", "Marking nodes visited so none are processed twice"),
    ("mentions that BFS finds the shortest path in an unweighted graph", "Finding the shortest path in an unweighted graph"),
]
_DFS_RUBRIC = [
    ("mentions using a stack or recursion (LIFO)", "Using a stack or recursion (last-in, first-out)"),
    ("explains going as deep as possible before backtracking", "Going as deep as possible before backtracking"),
    ("mentions marking nodes visited to avoid revisiting", "Marking nodes visited so none are processed twice"),
]
_BST_RUBRIC = [
    ("mentions that left children are smaller and right children are larger", "Left children smaller, right children larger"),
    ("explains comparing the target/inserted value against the current node to choose a direction", "Comparing against the current node to choose left or right"),
    ("mentions that an inorder traversal of a BST visits values in sorted order", "Inorder traversal visits values in sorted order"),
]
FEYNMAN_RUBRIC.update(
    {
        "bfs": _BFS_RUBRIC,
        "breadth_first_search": _BFS_RUBRIC,
        "dfs": _DFS_RUBRIC,
        "depth_first_search": _DFS_RUBRIC,
        "bst": _BST_RUBRIC,
        "binary_search_tree": _BST_RUBRIC,
    }
)

FEYNMAN_PROMPT = """You are playing the role of a curious but confused beginner student who has never seen {algorithm_name} before.

A peer student just explained {algorithm_name} to you after completing this exercise: {completion_context}

Their explanation was:
"{student_explanation}"

You must evaluate their explanation against this rubric of key concepts:
{rubric}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "rubric_results": [
    {{"concept_label": "<the exact concept label from the rubric>", "met": <true if the explanation clearly covers this concept, false otherwise>}}
    <one entry per rubric concept, in the order given, using the exact labels>
  ],
  "feedback_summary": "<2-3 sentences of feedback written as the confused beginner student, praising what was clear and noting what confused you. Use first person, conversational, not academic>",
  "follow_up_question": "<a single follow-up question you still have as the confused beginner, targeting the most important missing concept. null if every concept was met>"
}}

The feedback_summary and follow_up_question must sound like a real confused student, not a teacher or AI.
Example feedback_summary: "Ok that mostly made sense! I get that you swap them if the left one is bigger. But I am confused, do you always have to go through the whole list every time? What happens if it is already sorted?"
Example follow_up_question: "So after one full pass, does that mean the entire list is sorted or just part of it?"

Use ONLY the exact concept labels given above in "concept_label" - never invent
your own phrasing. Do not compute a score or decide completeness yourself;
that is handled outside this response.
"""

DEFAULT_RUBRIC = [
    ("explains the core algorithm logic", "The core algorithm logic"),
    ("describes the step sequence", "The step-by-step sequence"),
    ("mentions the termination condition", "When the algorithm stops"),
]

# An explanation judged "complete" (no follow-up needed) once at least this
# fraction of rubric concepts are met - mirrors the old score >= 75 cutoff,
# now computed in code instead of asked of the model.
COMPLETION_THRESHOLD = 0.75

_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "this", "that", "it", "at", "by", "with", "as", "if", "then", "else",
    "from", "be", "was", "were", "has", "have", "had", "not", "but", "so",
    "each", "into", "until", "while", "its", "their", "there", "which",
}

# An explanation this close to the reference text (pseudocode, algorithm
# context, and the narration the student already saw) is being copied
# rather than restated - grading it would reward reciting words, not
# understanding them.
OVERLAP_GAMING_THRESHOLD = 0.6


def _significant_words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z']+", text.lower()) if len(w) > 3 and w not in _STOPWORDS}


def _looks_copied_from_reference(student_explanation: str, reference_text: str) -> bool:
    student_words = _significant_words(student_explanation)
    if not student_words:
        return False
    reference_words = _significant_words(reference_text)
    if not reference_words:
        return False
    overlap = student_words & reference_words
    return (len(overlap) / len(student_words)) >= OVERLAP_GAMING_THRESHOLD


def score_feynman_response(rubric: list[tuple[str, str]], data: dict) -> FeynmanResponse:
    """Turns the model's per-concept booleans into a score, completeness
    flag and missing-concepts list computed in code - the model is asked
    for facts about the explanation (which concepts it covers), never for
    the score or completeness judgement itself, so the same coverage
    always produces the same score regardless of model phrasing."""
    raw_results = data.get("rubric_results") or []
    met_by_label = {
        r.get("concept_label"): bool(r.get("met"))
        for r in raw_results
        if isinstance(r, dict) and isinstance(r.get("concept_label"), str)
    }
    # Rebuilt against the rubric's own labels, in order, rather than
    # trusting whatever set of labels the model chose to return - a label
    # the model invented or renamed must not silently count as met, and a
    # label it forgot must not silently count as covered.
    rubric_results = [
        FeynmanRubricItemResult(concept_label=label, met=met_by_label.get(label, False)) for _criterion, label in rubric
    ]
    met_count = sum(1 for r in rubric_results if r.met)
    score = round((met_count / len(rubric_results)) * 100) if rubric_results else 0
    missing_concepts = [r.concept_label for r in rubric_results if not r.met]
    is_complete = bool(rubric_results) and (met_count / len(rubric_results)) >= COMPLETION_THRESHOLD

    return FeynmanResponse(
        score=score,
        feedback_summary=data.get("feedback_summary", ""),
        follow_up_question=None if is_complete else data.get("follow_up_question"),
        missing_concepts=missing_concepts,
        is_complete=is_complete,
        rubric_results=rubric_results,
    )


@router.post("/", response_model=FeynmanResponse)
async def evaluate_feynman(request: FeynmanRequest) -> FeynmanResponse:
    algorithm_context, pseudocode, _junction_guidance = get_algorithm_context(request.algorithm_name)
    reference_text = "\n".join([algorithm_context, pseudocode, *request.step_descriptions])

    if _looks_copied_from_reference(request.student_explanation, reference_text):
        return FeynmanResponse(
            score=0,
            feedback_summary=(
                "Hmm, that sounds a lot like the pseudocode and step descriptions I already saw on screen, "
                "not something explained to me. Can you tell me in your own words instead, like you would to "
                "a friend who has never coded before?"
            ),
            follow_up_question="Can you explain it again, but in your own words rather than the on-screen wording?",
            missing_concepts=[],
            is_complete=False,
            rubric_results=[],
        )

    rubric = FEYNMAN_RUBRIC.get(_normalize(request.algorithm_name), DEFAULT_RUBRIC)
    rubric_text = "\n".join(f'- {criterion} (concept label: "{label}")' for criterion, label in rubric)

    prompt = FEYNMAN_PROMPT.format(
        algorithm_name=request.algorithm_name,
        completion_context=request.completion_context,
        student_explanation=request.student_explanation,
        rubric=rubric_text,
    )

    try:
        data, _metadata = await call_claude_for_feedback(prompt)
        return score_feynman_response(rubric, data)
    except Exception as e:
        logger.warning(f"Feynman evaluation failed: {e}")
        return FeynmanResponse(
            score=0,
            feedback_summary="I could not understand your explanation. Could you try again?",
            follow_up_question="Can you explain it again from the beginning?",
            missing_concepts=[],
            is_complete=False,
            rubric_results=[],
        )
