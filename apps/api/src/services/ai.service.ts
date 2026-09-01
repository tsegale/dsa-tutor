import type {
  PredictionRequest,
  PredictionResponse,
  HintRequest,
  HintResponse,
  FeynmanRequest,
  FeynmanResponse,
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
    }),
  })
  if (!response.ok) throw new Error(`AI service error: ${response.status}`)
  const data = (await response.json()) as any
  return {
    correct: data.correct,
    misconceptionCategory: data.misconceptionCategory,
    consequenceExplanation: data.consequenceExplanation,
    socraticHint: data.socraticHint,
    xpAwarded: data.xpAwarded,
    counterfactualTrace: data.counterfactualTrace ?? '',
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

export async function proxyHint(request: HintRequest): Promise<HintResponse> {
  const response = await fetch(`${AI_URL}/api/v1/hints/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm_name: request.algorithmName,
      step_index: request.stepIndex,
      current_prediction_prompt: request.currentPredictionPrompt,
      error_history: request.errorHistory,
      scaffolding_level: request.scaffoldingLevel,
    }),
  })
  if (!response.ok) throw new Error(`AI hint error: ${response.status}`)
  const data = (await response.json()) as any
  return { hint: data.hint, scaffoldingLevel: data.scaffoldingLevel }
}
