import type {
  PredictionRequest,
  PredictionResponse,
  HintRequest,
  HintResponse,
  FeynmanRequest,
  FeynmanResponse,
  ChallengeRequest,
  ChallengeResponse,
  CodeEvalRequest,
  CodeEvalResponse,
  StudentSummaryRequest,
  StudentSummaryResponse,
  ClassSummaryRequest,
  ClassSummaryResponse,
} from '@dsa-tutor/types'

const AI_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'

// The AI microservice's response models serialize with a camelCase alias
// generator (see apps/ai/models/response_models.py), so the JSON it
// returns is already shaped like PredictionResponse/HintResponse - only
// the outbound request needs the camelCase -> snake_case translation,
// since the AI service's request models use snake_case field names.
export async function proxyPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  const response = await fetch(`${AI_URL}/api/v1/predictions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      step_index: request.stepIndex,
      current_state: request.currentState,
      student_answer: request.studentAnswer,
      error_history: request.errorHistory,
      scaffolding_level: request.scaffoldingLevel,
      session_id: request.sessionId,
      junction_type: request.junctionType ?? null,
      junction_difficulty: request.junctionDifficulty ?? null,
      ground_truth_misconception: request.groundTruthMisconception ?? null,
    }),
  })
  if (!response.ok) throw new Error(`AI service error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    correct: data.correct,
    misconceptionCategory: data.misconceptionCategory,
    aiMisconceptionCategory: data.aiMisconceptionCategory ?? null,
    consequenceExplanation: data.consequenceExplanation,
    socraticHint: data.socraticHint,
    xpAwarded: data.xpAwarded,
    counterfactualTrace: data.counterfactualTrace ?? '',
    aiGenerated: data.aiGenerated ?? true,
  }
}

// Unlike PredictionResponse/HintResponse, the AI service's FeynmanResponse
// model is a plain Pydantic BaseModel (no camelCase alias generator), so
// its JSON comes back snake_case and needs explicit field mapping here.
export async function proxyFeynman(request: FeynmanRequest): Promise<FeynmanResponse> {
  const response = await fetch(`${AI_URL}/api/v1/feynman/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      algorithm_context: request.algorithmContext,
      student_explanation: request.studentExplanation,
      completion_context: request.completionContext,
      session_id: request.sessionId,
    }),
  })
  if (!response.ok) throw new Error(`AI feynman error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    score: data.score,
    feedbackSummary: data.feedback_summary,
    followUpQuestion: data.follow_up_question ?? null,
    missingConcepts: data.missing_concepts ?? [],
    isComplete: data.is_complete,
  }
}

// Like FeynmanResponse, the AI service's ChallengeResponse model is a
// plain Pydantic BaseModel (no camelCase alias generator), so its JSON
// comes back snake_case and needs explicit field mapping here.
export async function proxyChallenge(request: ChallengeRequest): Promise<ChallengeResponse> {
  const response = await fetch(`${AI_URL}/api/v1/challenges/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      top_misconception: request.topMisconception,
      difficulty: request.difficulty,
      session_history: request.sessionHistory,
      array_size: request.arraySize ?? 7,
    }),
  })
  if (!response.ok) throw new Error(`AI challenge error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    array: data.array,
    challengeType: data.challenge_type,
    explanation: data.explanation,
    hintForStudent: data.hint_for_student,
  }
}

// Like FeynmanResponse/ChallengeResponse, the AI service's CodeEvalResponse
// model is a plain Pydantic BaseModel (no camelCase alias generator), so
// its JSON comes back snake_case and needs explicit field mapping here.
export async function proxyCodeEval(request: CodeEvalRequest): Promise<CodeEvalResponse> {
  const response = await fetch(`${AI_URL}/api/v1/code-eval/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      current_array_state: request.currentArrayState,
      active_indices: request.activeIndices,
      expected_next_state: request.expectedNextState,
      student_code: request.studentCode,
      language: request.language,
      step_description: request.stepDescription,
    }),
  })
  if (!response.ok) throw new Error(`AI code-eval error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    isLogicallyCorrect: data.is_logically_correct,
    hasSyntaxError: data.has_syntax_error,
    resultingState: data.resulting_state ?? null,
    errorExplanation: data.error_explanation ?? null,
    bugType: data.bug_type ?? null,
    correctiveHint: data.corrective_hint,
    executeVisually: data.execute_visually,
  }
}

// Like the other AI service response models, Student/ClassSummaryResponse
// are plain Pydantic BaseModels (no camelCase alias generator), so their
// JSON comes back snake_case and needs explicit field mapping here.
export async function proxyStudentSummary(request: StudentSummaryRequest): Promise<StudentSummaryResponse> {
  const response = await fetch(`${AI_URL}/api/v1/summaries/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: request.studentId,
      student_name: request.studentName,
      algorithm_name: request.algorithmName,
      total_sessions: request.totalSessions,
      total_predictions: request.totalPredictions,
      correct_predictions: request.correctPredictions,
      hints_requested: request.hintsRequested,
      misconception_breakdown: request.misconceptionBreakdown,
      scaffolding_progression: request.scaffoldingProgression,
      feynman_scores: request.feynmanScores,
      average_time_per_step: request.averageTimePerStep,
    }),
  })
  if (!response.ok) throw new Error(`AI student summary error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    narrativeSummary: data.narrative_summary,
    strengthAreas: data.strength_areas ?? [],
    concernAreas: data.concern_areas ?? [],
    recommendedAction: data.recommended_action,
    scaffoldingTrend: data.scaffolding_trend,
  }
}

export async function proxyClassSummary(request: ClassSummaryRequest): Promise<ClassSummaryResponse> {
  const response = await fetch(`${AI_URL}/api/v1/summaries/class`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      total_students: request.totalStudents,
      average_correct_rate: request.averageCorrectRate,
      top_misconceptions: request.topMisconceptions,
      step_difficulty_heatmap: request.stepDifficultyHeatmap,
      scaffolding_distribution: request.scaffoldingDistribution,
    }),
  })
  if (!response.ok) throw new Error(`AI class summary error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    narrativeSummary: data.narrative_summary,
    keyFindings: data.key_findings ?? [],
    recommendedInterventions: data.recommended_interventions ?? [],
    curriculumAdjustment: data.curriculum_adjustment ?? null,
  }
}

export async function proxyHint(request: HintRequest): Promise<HintResponse> {
  const response = await fetch(`${AI_URL}/api/v1/hints/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      step_index: request.stepIndex,
      current_prediction_prompt: request.currentPredictionPrompt,
      current_state: request.currentState ?? null,
      hint_index: request.hintIndex ?? null,
      error_history: request.errorHistory,
      scaffolding_level: request.scaffoldingLevel,
    }),
  })
  if (!response.ok) throw new Error(`AI hint error: ${response.status}`)
  const data = (await response.json()) as any
  return { hint: data.hint, scaffoldingLevel: data.scaffoldingLevel, aiGenerated: data.aiGenerated ?? true }
}
