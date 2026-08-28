import type { HintRequest, HintResponse, PredictionRequest, PredictionResponse } from '@dsa-tutor/types'

const AI_BASE_URL = import.meta.env.VITE_AI_URL ?? 'http://localhost:8000'

function toSnakeCase(request: object): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(request)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

export async function submitPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/predictions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSnakeCase(request)),
  })

  if (!response.ok) {
    throw new Error(`Prediction request failed: ${response.status}`)
  }

  return (await response.json()) as PredictionResponse
}

export async function requestHint(request: HintRequest): Promise<HintResponse> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/hints/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSnakeCase(request)),
  })

  if (!response.ok) {
    throw new Error(`Hint request failed: ${response.status}`)
  }

  return (await response.json()) as HintResponse
}
