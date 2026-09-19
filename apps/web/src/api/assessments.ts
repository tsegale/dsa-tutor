import { apiFetch } from './client'
import type { AssessmentAttemptDto, AssessmentResponseRequest } from '@dsa-tutor/types'

export function startAssessment(code: string) {
  return apiFetch<AssessmentAttemptDto>(`/api/v1/assessments/${code}/start`, { method: 'POST' })
}

export function submitAssessmentResponse(attemptId: string, body: AssessmentResponseRequest) {
  return apiFetch<{ recorded: boolean }>(`/api/v1/assessments/attempts/${attemptId}/responses`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function completeAssessment(attemptId: string) {
  return apiFetch<{ completed: boolean }>(`/api/v1/assessments/attempts/${attemptId}/complete`, {
    method: 'POST',
  })
}
