import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.claude_service import call_claude_for_feedback

router = APIRouter(prefix="/code-eval", tags=["code-eval"])
logger = logging.getLogger(__name__)


class CodeEvalRequest(BaseModel):
    algorithm_name: str
    current_array_state: list[int]
    active_indices: list[int]
    expected_next_state: list[int]  # what the correct next step looks like
    student_code: str
    language: str  # 'pseudocode' | 'python' | 'java'
    step_description: str  # plain English description of what should happen at this step


class CodeEvalResponse(BaseModel):
    is_logically_correct: bool
    has_syntax_error: bool
    resulting_state: list[int] | None  # the array state after applying the student's code
    error_explanation: str | None
    bug_type: str | None  # 'off_by_one' | 'wrong_condition' | 'missing_swap' | 'syntax' | null
    corrective_hint: str  # Socratic question if wrong, praise if right
    execute_visually: bool  # true = run the student's code in the visualiser, false = show error


CODE_EVAL_PROMPT = """You are evaluating a student's code for one step of {algorithm_name}.

Current array state: {current_array_state}
Elements being compared: indices {active_indices}
What should happen at this step: {step_description}
Expected resulting array: {expected_next_state}

The student wrote this {language} code:

{student_code}

Evaluate whether the student's code correctly implements the described step.

Respond ONLY with valid JSON matching this exact schema:
{{
  "is_logically_correct": <true if the code correctly implements the step>,
  "has_syntax_error": <true if the code has syntax errors that prevent evaluation>,
  "resulting_state": <the array state after applying the student's code as a JSON list of integers, or null if has_syntax_error>,
  "error_explanation": <null if correct, otherwise one sentence explaining exactly what the code does wrong, be specific about which line and why>,
  "bug_type": <null if correct, otherwise one of: "off_by_one", "wrong_condition", "missing_swap", "wrong_index", "syntax">,
  "corrective_hint": <if correct: one sentence of genuine praise. if wrong: one Socratic question guiding the student toward the bug without revealing it>,
  "execute_visually": <true if correct or if the bug produces a valid (but wrong) array state that can be visualised, false if syntax error>
}}

Important: if execute_visually is true and is_logically_correct is false, the resulting_state should reflect what the student's buggy code actually produces so the visualiser can show the consequence of their bug.
"""


@router.post("/", response_model=CodeEvalResponse)
async def evaluate_code(request: CodeEvalRequest) -> CodeEvalResponse:
    prompt = CODE_EVAL_PROMPT.format(
        algorithm_name=request.algorithm_name,
        current_array_state=request.current_array_state,
        active_indices=request.active_indices,
        step_description=request.step_description,
        expected_next_state=request.expected_next_state,
        language=request.language,
        student_code=request.student_code,
    )
    try:
        data = await call_claude_for_feedback(prompt)
        resulting = data.get("resulting_state")
        if resulting is not None:
            if not isinstance(resulting, list) or not all(isinstance(x, int) for x in resulting):
                resulting = None
        return CodeEvalResponse(
            is_logically_correct=bool(data.get("is_logically_correct", False)),
            has_syntax_error=bool(data.get("has_syntax_error", False)),
            resulting_state=resulting,
            error_explanation=data.get("error_explanation"),
            bug_type=data.get("bug_type"),
            corrective_hint=data.get("corrective_hint", ""),
            execute_visually=bool(data.get("execute_visually", False)),
        )
    except Exception as e:
        logger.warning(f"Code evaluation failed: {e}")
        return CodeEvalResponse(
            is_logically_correct=False,
            has_syntax_error=True,
            resulting_state=None,
            error_explanation="Could not evaluate your code. Check for syntax errors and try again.",
            bug_type="syntax",
            corrective_hint="Make sure your code is valid and try submitting again.",
            execute_visually=False,
        )
