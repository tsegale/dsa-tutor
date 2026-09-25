import type {
  HintRequest,
  HintResponse,
  PredictionEvaluateResponse,
  PredictionRequest,
  PredictionResponse,
} from '@dsa-tutor/types'
import { apiFetch, apiRequest } from './client'
import { parseSseEvents } from '@/utils/sse'

export async function submitPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>('/api/v1/ai/predictions', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export interface StreamedPrediction {
  response: PredictionResponse
  /** True when text was previewed but failed validation, so the preview
   * must be swapped for the fallback in response. */
  replaced: boolean
}

/**
 * Streams the explanation as the model writes it: onPreview receives the
 * explanation text so far after every delta. Resolves with the final,
 * server-validated response. Rejects if the stream cannot be opened or
 * ends without a final event - the caller then falls back to
 * submitPrediction, so a broken stream never loses the feedback.
 */
export async function streamPrediction(
  request: PredictionRequest,
  onPreview: (explanationSoFar: string) => void,
): Promise<StreamedPrediction> {
  const response = await apiRequest('/api/v1/ai/predictions/stream', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  if (!response.ok || !response.body) throw new Error(`Prediction stream failed: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let preview = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const { events, rest } = parseSseEvents(buffer + decoder.decode(value, { stream: true }))
    buffer = rest
    for (const event of events) {
      const payload = JSON.parse(event.data) as { text?: string; response?: PredictionResponse; replaced?: boolean }
      if (event.event === 'delta' && payload.text) {
        preview += payload.text
        onPreview(preview)
      } else if (event.event === 'final' && payload.response) {
        await reader.cancel()
        return { response: payload.response, replaced: payload.replaced ?? false }
      }
    }
  }
  throw new Error('Prediction stream ended without a final event')
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
