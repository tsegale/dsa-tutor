import { apiFetch } from './client'
import type { StudyStatusDto } from '@dsa-tutor/types'

export function fetchStudyStatus() {
  return apiFetch<StudyStatusDto>('/api/v1/study/status')
}

export function enrolInStudy(code: string) {
  return apiFetch<StudyStatusDto>('/api/v1/study/enrol', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function recordConsent() {
  return apiFetch<{ consented: boolean }>('/api/v1/study/consent', { method: 'POST' })
}

export function withdrawFromStudy() {
  return apiFetch<{ withdrawn: boolean }>('/api/v1/study/withdraw', { method: 'POST' })
}

export function submitSus(responses: number[]) {
  return apiFetch<{ score: number }>('/api/v1/study/sus', {
    method: 'POST',
    body: JSON.stringify({ responses }),
  })
}

/** Researcher-only: opens the post-test without the topic-completion rule met (recorded). */
export function overridePosttest(pin: string) {
  return apiFetch<StudyStatusDto>('/api/v1/study/posttest-override', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}
