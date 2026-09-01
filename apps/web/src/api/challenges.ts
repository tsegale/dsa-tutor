import { apiFetch } from './client'
import type { ChallengeRequest, ChallengeResponse } from '@dsa-tutor/types'

export async function generateChallenge(request: ChallengeRequest): Promise<ChallengeResponse> {
  return apiFetch<ChallengeResponse>('/api/v1/ai/challenges', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
