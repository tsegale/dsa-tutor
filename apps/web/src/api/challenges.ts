import { apiFetch } from './client'
import type { ChallengeRequest, ChallengeResponse } from '@dsa-tutor/types'

/** Asks for the one framing sentence for a client-generated challenge case. */
export async function frameChallenge(request: ChallengeRequest): Promise<ChallengeResponse> {
  return apiFetch<ChallengeResponse>('/api/v1/ai/challenges', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
