/** Fewer points than this read better as a table than as a chart (Phase 6C). */
export const MIN_CHART_POINTS = 5

/** Consecutive points at one support level, as [start, end) index runs: the chart's shaded bands. */
export function levelRuns(points: readonly { level: string }[]): { level: string; start: number; end: number }[] {
  const runs: { level: string; start: number; end: number }[] = []
  points.forEach((point, index) => {
    const last = runs[runs.length - 1]
    if (last && last.level === point.level) last.end = index + 1
    else runs.push({ level: point.level, start: index, end: index + 1 })
  })
  return runs
}
