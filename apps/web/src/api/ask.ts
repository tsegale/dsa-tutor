import type { AskRequest, AskResponse } from '@dsa-tutor/types'
import { apiFetch } from './client'

/**
 * Demo mode's free-form assistant. Explains on request; never questions
 * back. See apps/ai/routers/ask.py for the stance and the grounding rules.
 */
export async function askTutor(request: AskRequest): Promise<AskResponse> {
  return apiFetch<AskResponse>('/api/v1/ai/ask', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
