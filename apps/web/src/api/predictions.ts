import type {
  HintRequest,
  HintResponse,
  PredictionEvaluateResponse,
  PredictionRequest,
  PredictionResponse,
} from '@dsa-tutor/types'
import { apiFetch } from './client'

export async function submitPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>('/api/v1/ai/predictions', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// The deterministic verdict only - no AI call on the backend, so this
// resolves in milliseconds and lets the UI show correct/incorrect before
// the full explanation arrives via submitPrediction (remediation doc 12B.3).
export async function evaluatePrediction(request: PredictionRequest): Promise<PredictionEvaluateResponse> {
  return apiFetch<PredictionEvaluateResponse>('/api/v1/ai/predictions/evaluate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function requestHint(request: HintRequest): Promise<HintResponse> {
  return apiFetch<HintResponse>('/api/v1/ai/hints', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
