import { apiFetch } from './client'
import type {
  MisconceptionEventDto,
  RemediationDto,
  ProbeResultDto,
  MisconceptionSummaryDto,
  EducatorMisconceptionSummaryRow,
} from '@dsa-tutor/types'

export function detectMisconception(algorithmTopicId: string, category: string, detectedInteractionId: string) {
  return apiFetch<{ event: MisconceptionEventDto; nextLevel: number }>('/api/v1/misconception-events/detect', {
    method: 'POST',
    body: JSON.stringify({ algorithmTopicId, category, detectedInteractionId }),
  })
}

export function presentRemediation(eventId: string, taskType: string, level: number, payload: unknown) {
  return apiFetch<RemediationDto>(`/api/v1/misconception-events/${eventId}/remediations`, {
    method: 'POST',
    body: JSON.stringify({ taskType, level, payload }),
  })
}

export function completeRemediation(remediationId: string, correct: boolean | null, skipped: boolean) {
  return apiFetch<RemediationDto>(`/api/v1/misconception-events/remediations/${remediationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ correct, skipped }),
  })
}

export function recordProbe(
  eventId: string,
  interactionId: string,
  junctionType: string,
  optionCount: number,
  correct: boolean,
  hintUsed: boolean,
) {
  return apiFetch<ProbeResultDto>(`/api/v1/misconception-events/${eventId}/probes`, {
    method: 'POST',
    body: JSON.stringify({ interactionId, junctionType, optionCount, correct, hintUsed }),
  })
}

export function tickJunction(algorithmTopicId: string) {
  return apiFetch<{ ok: boolean }>('/api/v1/misconception-events/junction-tick', {
    method: 'POST',
    body: JSON.stringify({ algorithmTopicId }),
  })
}

export function checkStaleEventsOnSessionStart(algorithmTopicId: string) {
  return apiFetch<{ ok: boolean }>('/api/v1/misconception-events/session-check', {
    method: 'POST',
    body: JSON.stringify({ algorithmTopicId }),
  })
}

export function fetchEventStatusForTopic(algorithmTopicId: string) {
  return apiFetch<MisconceptionEventDto[]>(`/api/v1/misconception-events/status?algorithmTopicId=${algorithmTopicId}`)
}

export function fetchMisconceptionSummary() {
  return apiFetch<MisconceptionSummaryDto>('/api/v1/misconception-events/summary')
}

export function fetchEducatorMisconceptionSummary() {
  return apiFetch<EducatorMisconceptionSummaryRow[]>('/api/v1/misconception-events/educator-summary')
}
