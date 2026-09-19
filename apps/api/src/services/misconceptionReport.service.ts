import { prisma } from '../lib/prisma'

export interface EventForReport {
  category: string
  status: string
  junctionsSinceDetection: number
  probes: Array<{ optionCount: number }>
}

export interface CategoryReportRow {
  category: string
  detectionCount: number
  resolvedCount: number
  persistentCount: number
  abandonedCount: number
  // Abandoned events are excluded from this denominator - an event that
  // was never retested cannot count as evidence the misconception was
  // either resolved or persistent, in either direction.
  resolutionDenominator: number
  resolutionRate: number
  persistenceRate: number
  abandonmentRate: number
  medianJunctionsToResolution: number | null
  aggregateGuessProbability: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Deterministic aggregation only - no LLM or statistics library. Grouped
 * by category so the report can be read alongside the probe mapping table
 * in misconceptionProbes.ts. */
export function computeMisconceptionReport(events: EventForReport[]): CategoryReportRow[] {
  const byCategory = new Map<string, EventForReport[]>()
  for (const event of events) {
    const bucket = byCategory.get(event.category) ?? []
    bucket.push(event)
    byCategory.set(event.category, bucket)
  }

  return [...byCategory.entries()]
    .map(([category, categoryEvents]) => {
      const detectionCount = categoryEvents.length
      const resolvedCount = categoryEvents.filter((e) => e.status === 'RESOLVED').length
      const persistentCount = categoryEvents.filter((e) => e.status === 'PERSISTENT').length
      const abandonedCount = categoryEvents.filter((e) => e.status === 'ABANDONED').length
      const resolutionDenominator = detectionCount - abandonedCount

      const allProbeOptionCounts = categoryEvents.flatMap((e) => e.probes.map((p) => p.optionCount))
      const guessProbabilities = allProbeOptionCounts.map((count) => 1 / count)
      const aggregateGuessProbability =
        guessProbabilities.length > 0
          ? guessProbabilities.reduce((sum, p) => sum + p, 0) / guessProbabilities.length
          : null

      return {
        category,
        detectionCount,
        resolvedCount,
        persistentCount,
        abandonedCount,
        resolutionDenominator,
        resolutionRate: resolutionDenominator > 0 ? resolvedCount / resolutionDenominator : 0,
        persistenceRate: resolutionDenominator > 0 ? persistentCount / resolutionDenominator : 0,
        abandonmentRate: detectionCount > 0 ? abandonedCount / detectionCount : 0,
        medianJunctionsToResolution: median(
          categoryEvents.filter((e) => e.status === 'RESOLVED').map((e) => e.junctionsSinceDetection),
        ),
        aggregateGuessProbability,
      }
    })
    .sort((a, b) => a.category.localeCompare(b.category))
}

export function misconceptionReportToMarkdown(rows: CategoryReportRow[]): string {
  const header =
    '| Category | Detected | Resolved | Persistent | Abandoned | Resolution rate (of N) | Persistence rate (of N) | Abandonment rate | Median junctions to resolution | Aggregate guess probability |'
  const divider = '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  const body = rows.map((r) => {
    const pct = (n: number) => `${Math.round(n * 1000) / 10}%`
    return (
      `| ${r.category} | ${r.detectionCount} | ${r.resolvedCount} | ${r.persistentCount} | ${r.abandonedCount} | ` +
      `${pct(r.resolutionRate)} (N=${r.resolutionDenominator}) | ${pct(r.persistenceRate)} (N=${r.resolutionDenominator}) | ` +
      `${pct(r.abandonmentRate)} | ${r.medianJunctionsToResolution ?? '-'} | ` +
      `${r.aggregateGuessProbability !== null ? pct(r.aggregateGuessProbability) : '-'} |`
    )
  })
  return [header, divider, ...body].join('\n')
}

async function fetchAllEventsForReport(): Promise<EventForReport[]> {
  const events = await prisma.misconceptionEvent.findMany({
    include: { probes: { select: { optionCount: true } } },
  })
  return events.map((e) => ({
    category: e.category,
    status: e.status,
    junctionsSinceDetection: e.junctionsSinceDetection,
    probes: e.probes,
  }))
}

/** apps/api/scripts/misconception-report.ts prints this as markdown. */
export async function getMisconceptionReport(): Promise<CategoryReportRow[]> {
  return computeMisconceptionReport(await fetchAllEventsForReport())
}

export interface EducatorMisconceptionSummaryRow {
  category: string
  detected: number
  resolved: number
  persistent: number
  abandoned: number
  medianJunctionsToResolution: number | null
}

/** Same underlying aggregation as the research report, trimmed to the
 * columns the doc asks for on the educator dashboard (no rates or guess
 * probability - those are for the methodology writeup, not classroom use). */
export async function getEducatorMisconceptionSummary(): Promise<EducatorMisconceptionSummaryRow[]> {
  const rows = await getMisconceptionReport()
  return rows.map((r) => ({
    category: r.category,
    detected: r.detectionCount,
    resolved: r.resolvedCount,
    persistent: r.persistentCount,
    abandoned: r.abandonedCount,
    medianJunctionsToResolution: r.medianJunctionsToResolution,
  }))
}
