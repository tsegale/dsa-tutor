import { apiFetch } from './client'
import type { CodeEvalRequest, CodeEvalResponse } from '@dsa-tutor/types'

export async function evaluateCode(request: CodeEvalRequest): Promise<CodeEvalResponse> {
  return apiFetch<CodeEvalResponse>('/api/v1/ai/code-eval', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
