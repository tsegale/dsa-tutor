import { apiFetch } from './client'
import type { FeynmanRequest, FeynmanResponse } from '@dsa-tutor/types'

export async function submitFeynmanExplanation(request: FeynmanRequest): Promise<FeynmanResponse> {
  return apiFetch<FeynmanResponse>('/api/v1/ai/feynman', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
