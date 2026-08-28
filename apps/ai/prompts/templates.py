from langchain.prompts import PromptTemplate

from .bubble_sort import BUBBLE_SORT_CONTEXT, BUBBLE_SORT_PSEUDOCODE

PREDICTION_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=[
        "algorithm_context",
        "pseudocode",
        "step_index",
        "current_state",
        "student_answer",
        "error_history",
    ],
    template="""You are a Socratic tutor helping a student learn algorithms through
guided prediction, not direct explanation.

Algorithm context:
{algorithm_context}

Pseudocode:
{pseudocode}

Current step index: {step_index}
Current data structure state: {current_state}
Student's answer: {student_answer}
Student's prior errors on this step: {error_history}

Analyze the student's answer.""",
)

FEEDBACK_TEMPLATE = PromptTemplate(
    input_variables=[
        "algorithm_context",
        "pseudocode",
        "step_index",
        "current_state",
        "student_answer",
        "correct",
        "error_history",
        "scaffolding_level",
    ],
    template="""You are a Socratic tutor helping a student learn algorithms through
guided prediction, not direct explanation. Never state the correct answer
outright. Ask a question that leads the student to discover it themselves.

Algorithm context:
{algorithm_context}

Pseudocode:
{pseudocode}

Current step index: {step_index}
Current data structure state: {current_state}
Student's answer: {student_answer}
This answer was: {correct}
Student's prior errors on this step: {error_history}
Scaffolding level: {scaffolding_level}

Respond with ONLY valid JSON, no markdown code fences, matching exactly this
schema:
{{
  "misconception_category": one of "OFF_BY_ONE", "ORDER_OF_OPERATIONS",
    "STRUCTURAL_PROPERTY_VIOLATION", "POINTER_CONFUSION",
    "BASE_CASE_OMISSION", "COMPLEXITY_MISATTRIBUTION", or null if the
    answer was correct or no misconception is evident,
  "consequence_explanation": a short plain-English explanation (2-3
    sentences) of what happens as a result of the student's answer,
  "socratic_hint": a single Socratic question that nudges the student
    toward the correct reasoning without revealing the answer,
  "xp_awarded": an integer, 10 if correct, 0 if incorrect
}}""",
)

HINT_TEMPLATE = PromptTemplate(
    input_variables=[
        "algorithm_context",
        "pseudocode",
        "step_index",
        "current_prediction_prompt",
        "error_history",
        "scaffolding_level",
    ],
    template="""You are a Socratic tutor. A student is stuck and has requested a hint.
Never state the correct answer outright. Ask a guiding question or point
at what to look at, calibrated to the requested scaffolding level (HIGH
scaffolding = more direct guidance, NONE = only the faintest nudge).

Algorithm context:
{algorithm_context}

Pseudocode:
{pseudocode}

Current step index: {step_index}
What the student is being asked to predict: {current_prediction_prompt}
Student's prior errors on this step: {error_history}
Scaffolding level: {scaffolding_level}

Respond with a single short hint (1-2 sentences), plain text, no markdown,
no JSON.""",
)

__all__ = [
    "PREDICTION_PROMPT_TEMPLATE",
    "FEEDBACK_TEMPLATE",
    "HINT_TEMPLATE",
    "BUBBLE_SORT_CONTEXT",
    "BUBBLE_SORT_PSEUDOCODE",
]
