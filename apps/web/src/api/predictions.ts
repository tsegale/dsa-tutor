import type {
  HintRequest,
  HintResponse,
  PredictionEvaluateResponse,
  PredictionRequest,
  PredictionResponse,
} from '@dsa-tutor/types'
import { apiFetch, apiRequest } from './client'
import { parseSseEvents } from '@/utils/sse'
import type { FeedbackField } from '@/utils/displayedFeedback'

export async function submitPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  return apiFetch<PredictionResponse>('/api/v1/ai/predictions', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export interface StreamedPrediction {
  response: PredictionResponse
  /** Fields that carry rule-based fallback text instead of the model's. */
  fallbackFields: FeedbackField[]
  /** The rule that tripped, if any (e.g. "socratic_hint.words"). */
  failureReason: string | null
}

/** The stream opened but ended before its final event. */
export class StreamDisconnectedError extends Error {
  constructor() {
    super('Prediction stream ended without a final event')
    this.name = 'StreamDisconnectedError'
  }
}

/**
 * Streams prediction feedback. onPreview receives the explanation so far
 * after each delta; every delta is one whole sentence the server has
 * already validated, so nothing shown here is unchecked (see the AI
 * service's SentenceGate). Resolves with the final validated response.
 * Throws StreamDisconnectedError if the connection drops after opening,
 * or a plain Error if it never opened.
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
  const sentences: string[] = []
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const { events, rest } = parseSseEvents(buffer + decoder.decode(value, { stream: true }))
      buffer = rest
      for (const event of events) {
        const payload = JSON.parse(event.data) as {
          text?: string
          response?: PredictionResponse
          fallbackFields?: FeedbackField[]
          failureReason?: string | null
        }
        if (event.event === 'delta' && payload.text) {
          sentences.push(payload.text)
          onPreview(sentences.join(' '))
        } else if (event.event === 'final' && payload.response) {
          await reader.cancel()
          return {
            response: payload.response,
            fallbackFields: payload.fallbackFields ?? [],
            failureReason: payload.failureReason ?? null,
          }
        }
      }
    }
  } catch {
    // A dropped connection or a garbled event: either way the stream broke
    // after opening, which the caller handles as a disconnect.
    throw new StreamDisconnectedError()
  }
  throw new StreamDisconnectedError()
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
