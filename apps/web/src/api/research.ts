import { getToken } from './auth'
import { apiFetch } from './client'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type ResearchExportKind = 'interactions' | 'assessments' | 'sessions' | 'misconceptions' | 'misconception_events'

const EXPORT_PATHS: Record<ResearchExportKind, string> = {
  interactions: '/api/v1/research/interactions.csv',
  assessments: '/api/v1/research/assessments.csv',
  sessions: '/api/v1/research/sessions.csv',
  misconceptions: '/api/v1/research/misconceptions.csv',
  misconception_events: '/api/v1/research/misconception_events.csv',
}

// Export responses are raw CSV (Content-Type: text/csv), not the { data,
// error } JSON envelope apiFetch expects, so this bypasses it and talks to
// fetch directly.
export async function downloadResearchExport(kind: ResearchExportKind, includePilot: boolean): Promise<void> {
  const token = getToken()
  const path = `${EXPORT_PATHS[kind]}${includePilot ? '?includePilot=true' : ''}`
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(`Failed to export ${kind}`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${kind}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Operational health for the educator dashboard (Week 4 4D.4). */
export interface OpsReport {
  database: 'ok' | 'unreachable'
  aiService: 'ok' | 'unreachable'
  ai: {
    since: string
    calls: number
    cacheHitRate: number | null
    cacheReadShare: number | null
    latencyMsP50: number | null
    latencyMsP95: number | null
  } | null
  fallback: {
    windowDays: number
    wrongAnswersWithFeedback: number
    fallbacks: number
    rate: number | null
    byReason: Array<{ reason: string; count: number }>
  }
}

export function getOpsReport(): Promise<OpsReport> {
  return apiFetch<OpsReport>('/api/v1/research/ops')
}

export interface RaterQueueItemDto {
  interactionId: string
  participantCode: string
  algorithm: string
  stepIndex: number
  junctionType: string
  junctionDifficulty: string
  serialisedState: string
  studentAnswer: string
  ruleLabel: string | null
  aiLabel: string | null
  feedbackText: string
  ratings: Record<string, string>
}

export interface RaterAgreementComparisonDto {
  name: string
  kappa: {
    n: number
    observedAgreement: number
    expectedAgreement: number
    kappa: number | null
  }
  confusion: {
    labels: string[]
    counts: number[][]
  }
}

export interface RaterQueueResponseDto {
  taxonomy: string[]
  items: RaterQueueItemDto[]
  agreement: {
    raters: string[]
    itemCount: number
    comparisons: RaterAgreementComparisonDto[]
    aiPrecisionRecall: Array<{
      reference: string
      n: number
      rows: Array<{
        category: string
        support: number
        precision: number | null
        recall: number | null
      }>
    }>
  }
  markdown: string
}

export function getRaterQueue(includePilot = false): Promise<RaterQueueResponseDto> {
  return apiFetch<RaterQueueResponseDto>(
    `/api/v1/research/rater-queue${includePilot ? '?includePilot=true' : ''}`,
  )
}

export function submitBlindRating(
  interactionId: string,
  raterCode: string,
  label: string,
): Promise<{ imported: number }> {
  const csv = `interactionId,raterCode,label\n${interactionId},${raterCode},${label}`
  return apiFetch<{ imported: number }>('/api/v1/research/ratings', {
    method: 'POST',
    body: JSON.stringify({ csv }),
  })
}
