import { apiFetch } from './client'
import type { StudyStatusDto } from '@dsa-tutor/types'

export function fetchStudyStatus() {
  return apiFetch<StudyStatusDto>('/api/v1/study/status')
}

export function recordConsent() {
  return apiFetch<{ consented: boolean }>('/api/v1/study/consent', { method: 'POST' })
}

export function withdrawFromStudy() {
  return apiFetch<{ withdrawn: boolean }>('/api/v1/study/withdraw', { method: 'POST' })
}
