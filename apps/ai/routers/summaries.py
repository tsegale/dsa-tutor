import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.claude_service import call_claude_for_feedback

router = APIRouter(prefix="/summaries", tags=["summaries"])
logger = logging.getLogger(__name__)


class StudentSummaryRequest(BaseModel):
    student_id: str
    student_name: str
    algorithm_name: str
    total_sessions: int
    total_predictions: int
    correct_predictions: int
    hints_requested: int
    misconception_breakdown: dict  # category -> count
    scaffolding_progression: list[str]  # ordered list of scaffolding levels e.g. ['HIGH', 'HIGH', 'MEDIUM', 'LOW']
    feynman_scores: list[int]  # scores from Feynman mode if any
    average_time_per_step: float  # seconds


class StudentSummaryResponse(BaseModel):
    narrative_summary: str
    strength_areas: list[str]
    concern_areas: list[str]
    recommended_action: str
    scaffolding_trend: str  # 'improving' | 'stable' | 'declining' | 'insufficient_data'


class ClassSummaryRequest(BaseModel):
    algorithm_name: str
    total_students: int
    average_correct_rate: int
    top_misconceptions: list[dict]  # [{category, count}]
    step_difficulty_heatmap: list[dict]  # [{stepIndex, errorCount}]
    scaffolding_distribution: dict  # {HIGH: n, MEDIUM: n, LOW: n, NONE: n}


class ClassSummaryResponse(BaseModel):
    narrative_summary: str
    key_findings: list[str]
    recommended_interventions: list[str]
    curriculum_adjustment: str | None


STUDENT_SUMMARY_PROMPT = """You are an educational data analyst writing a natural language progress report for a teacher about one student.

Student: {student_name} (anonymised as Student {student_id})
Algorithm studied: {algorithm_name}

Performance data:
- Sessions completed: {total_sessions}
- Prediction accuracy: {correct_predictions}/{total_predictions} ({accuracy_percent}%)
- Hints requested: {hints_requested}
- Misconception breakdown: {misconception_breakdown}
- Scaffolding level progression: {scaffolding_progression}
- Feynman explanation scores: {feynman_scores}
- Average time per step: {average_time_per_step} seconds

Write a natural language progress report for the student's teacher. Be specific, professional, and actionable.

Respond ONLY with valid JSON:
{{
  "narrative_summary": "<3-4 sentences. State what the student understands well, what they struggle with, and the overall trajectory. Be specific, name the misconception categories and what they mean in plain terms. Do not be vague. Write as a professional educator report, not as an AI summary.>",
  "strength_areas": ["<specific strength 1>", "<specific strength 2>"],
  "concern_areas": ["<specific concern 1, name the misconception>", "<specific concern 2 if any>"],
  "recommended_action": "<one concrete, specific instructional recommendation for the teacher>",
  "scaffolding_trend": "<one of: improving, stable, declining, insufficient_data>"
}}
"""

CLASS_SUMMARY_PROMPT = """You are an educational data analyst writing a class-wide progress report for a teacher.

Algorithm: {algorithm_name}
Class size: {total_students} students
Average prediction accuracy: {average_correct_rate}%
Top misconceptions: {top_misconceptions}
Most difficult steps (by error frequency): {step_difficulty_heatmap}
Scaffolding level distribution: {scaffolding_distribution}

Write a class-wide analysis. Be specific and actionable.

Respond ONLY with valid JSON:
{{
  "narrative_summary": "<3-4 sentences summarising the class performance. Name specific steps that caused the most errors. Be direct, if most students are struggling, say so clearly.>",
  "key_findings": ["<finding 1, specific>", "<finding 2>", "<finding 3>"],
  "recommended_interventions": ["<intervention 1, specific and actionable for the teacher>", "<intervention 2>"],
  "curriculum_adjustment": "<one optional suggestion for adjusting how the algorithm is taught, or null if no adjustment is needed>"
}}
"""


@router.post("/student", response_model=StudentSummaryResponse)
async def generate_student_summary(request: StudentSummaryRequest) -> StudentSummaryResponse:
    accuracy = round((request.correct_predictions / max(request.total_predictions, 1)) * 100)
    prompt = STUDENT_SUMMARY_PROMPT.format(
        student_name=request.student_name,
        student_id=request.student_id[-4:],
        algorithm_name=request.algorithm_name,
        total_sessions=request.total_sessions,
        correct_predictions=request.correct_predictions,
        total_predictions=request.total_predictions,
        accuracy_percent=accuracy,
        hints_requested=request.hints_requested,
        misconception_breakdown=request.misconception_breakdown,
        scaffolding_progression=request.scaffolding_progression,
        feynman_scores=request.feynman_scores if request.feynman_scores else "none yet",
        average_time_per_step=round(request.average_time_per_step, 1),
    )
    try:
        data = await call_claude_for_feedback(prompt)
        return StudentSummaryResponse(
            narrative_summary=data.get("narrative_summary", ""),
            strength_areas=data.get("strength_areas", []),
            concern_areas=data.get("concern_areas", []),
            recommended_action=data.get("recommended_action", ""),
            scaffolding_trend=data.get("scaffolding_trend", "insufficient_data"),
        )
    except Exception as e:
        logger.warning(f"Student summary failed: {e}")
        return StudentSummaryResponse(
            narrative_summary="Summary unavailable, AI service could not be reached.",
            strength_areas=[],
            concern_areas=[],
            recommended_action="Review raw interaction logs manually.",
            scaffolding_trend="insufficient_data",
        )


@router.post("/class", response_model=ClassSummaryResponse)
async def generate_class_summary(request: ClassSummaryRequest) -> ClassSummaryResponse:
    prompt = CLASS_SUMMARY_PROMPT.format(
        algorithm_name=request.algorithm_name,
        total_students=request.total_students,
        average_correct_rate=request.average_correct_rate,
        top_misconceptions=request.top_misconceptions,
        step_difficulty_heatmap=request.step_difficulty_heatmap[:5],
        scaffolding_distribution=request.scaffolding_distribution,
    )
    try:
        data = await call_claude_for_feedback(prompt)
        return ClassSummaryResponse(
            narrative_summary=data.get("narrative_summary", ""),
            key_findings=data.get("key_findings", []),
            recommended_interventions=data.get("recommended_interventions", []),
            curriculum_adjustment=data.get("curriculum_adjustment"),
        )
    except Exception as e:
        logger.warning(f"Class summary failed: {e}")
        return ClassSummaryResponse(
            narrative_summary="Class summary unavailable.",
            key_findings=[],
            recommended_interventions=[],
            curriculum_adjustment=None,
        )
