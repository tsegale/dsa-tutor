import type { HintRequest, HintResponse, PredictionRequest, PredictionResponse } from '@dsa-tutor/types'
import { apiFetch } from './client'

export async function submitPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>('/api/v1/ai/predictions', {
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
