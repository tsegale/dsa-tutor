import { apiFetch } from './client'
import type {
  StudentSummaryRequest,
  StudentSummaryResponse,
  ClassSummaryRequest,
  ClassSummaryResponse,
} from '@dsa-tutor/types'

export async function getStudentSummary(request: StudentSummaryRequest): Promise<StudentSummaryResponse> {
  return apiFetch<StudentSummaryResponse>('/api/v1/ai/summaries/student', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function getClassSummary(request: ClassSummaryRequest): Promise<ClassSummaryResponse> {
  return apiFetch<ClassSummaryResponse>('/api/v1/ai/summaries/class', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
