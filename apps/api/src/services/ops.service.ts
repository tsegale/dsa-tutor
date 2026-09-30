import { prisma } from '../lib/prisma'

// Operational health (Week 4 4D.4): whether the api can reach its database
// and the AI service, and how the AI layer is performing. Counts only.

const AI_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const PROBE_TIMEOUT_MS = 2500
const FALLBACK_WINDOW_DAYS = 7

export type Reachability = 'ok' | 'unreachable'

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
}

export async function checkDatabase(): Promise<Reachability> {
  try {
    // A round trip, not a query of any table - Prisma has no ping of its own.
    await prisma.$queryRaw`SELECT 1`
    return 'ok'
  } catch {
    return 'unreachable'
  }
}

export async function checkAiService(): Promise<Reachability> {
  try {
    const response = await fetchWithTimeout(`${AI_URL}/health`)
    return response.ok ? 'ok' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

export interface AiMetrics {
  since: string
  calls: number
  cacheHitRate: number | null
  cacheReadShare: number | null
  latencyMsP50: number | null
  latencyMsP95: number | null
}

async function fetchAiMetrics(): Promise<AiMetrics | null> {
  try {
    const response = await fetchWithTimeout(`${AI_URL}/metrics`)
    if (!response.ok) return null
    const data = (await response.json()) as Record<string, unknown>
    return {
      since: String(data.since),
      calls: Number(data.calls),
      cacheHitRate: (data.cache_hit_rate as number | null) ?? null,
      cacheReadShare: (data.cache_read_share as number | null) ?? null,
      latencyMsP50: (data.latency_ms_p50 as number | null) ?? null,
      latencyMsP95: (data.latency_ms_p95 as number | null) ?? null,
    }
  } catch {
    return null
  }
}

export interface FallbackRate {
  windowDays: number
  wrongAnswersWithFeedback: number
  fallbacks: number
  rate: number | null
  byReason: Array<{ reason: string; count: number }>
}

/**
 * The study metric, as CLAUDE.md defines it: of the wrong answers that were
 * shown feedback, the share whose displayed feedback was not the model's.
 */
export async function wrongAnswerFallbackRate(since: Date): Promise<FallbackRate> {
  const where = { predictionCorrect: false, interactionType: 'PREDICTION', feedbackText: { not: null }, createdAt: { gte: since } }
  const [total, byReason] = await Promise.all([
    prisma.interaction.count({ where }),
    prisma.interaction.groupBy({ by: ['aiFailureReason'], where: { ...where, aiGenerated: false }, _count: { _all: true } }),
  ])
  const fallbacks = byReason.reduce((sum, row) => sum + row._count._all, 0)
  return {
    windowDays: FALLBACK_WINDOW_DAYS,
    wrongAnswersWithFeedback: total,
    fallbacks,
    rate: total > 0 ? Math.round((fallbacks / total) * 1000) / 1000 : null,
    byReason: byReason
      .map((row) => ({ reason: row.aiFailureReason ?? 'unrecorded', count: row._count._all }))
      .sort((a, b) => b.count - a.count),
  }
}

export interface OpsReport {
  database: Reachability
  aiService: Reachability
  ai: AiMetrics | null
  fallback: FallbackRate
}

export async function opsReport(now = new Date()): Promise<OpsReport> {
  const since = new Date(now.getTime() - FALLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [database, aiService, ai, fallback] = await Promise.all([
    checkDatabase(),
    checkAiService(),
    fetchAiMetrics(),
    wrongAnswerFallbackRate(since),
  ])
  return { database, aiService, ai, fallback }
}
