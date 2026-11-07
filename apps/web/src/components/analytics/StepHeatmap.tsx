import { useMemo, useState } from 'react'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ALGORITHM_REGISTRY } from '@/engine/registry'
import { junctionLabel, OTHER_STEPS_LABEL } from '@/utils/junctionLabel'

interface StepHeatmapProps {
  heatmap: EducatorAnalyticsDto['stepDifficultyHeatmap']
  // Not part of the heatmap array itself, but required by the spec's
  // tooltip copy ("... across {totalStudents} students") - passed down
  // separately from the page's analytics.totalStudents.
  totalStudents: number
}

interface PhaseBucket {
  label: string
  sub: string | null
  isHot: boolean
  totalErrors: number
}

/**
 * One column per kind of question, in the order the run first asks it.
 *
 * Phases used to be ranges of step numbers - hardcoded for Bubble Sort
 * (steps 11-50 "Comparison check", 51-70 "Pointer swap", ...) and split
 * into quarters for every other topic. Step numbers move with every custom
 * input, and the default Bubble Sort run is 52 steps long, so its last two
 * phases could never hold an error while swaps happened throughout. The
 * question asked is recorded with every answer, and it is the thing an
 * educator wants grouped: which kind of decision students get wrong.
 */
export function buildPhases(cells: EducatorAnalyticsDto['stepDifficultyHeatmap']): PhaseBucket[] {
  const byType = new Map<string, { label: string; firstStep: number; steps: Set<number>; totalErrors: number }>()
  for (const cell of cells) {
    const label = junctionLabel(cell.junctionType)
    const bucket = byType.get(label) ?? { label, firstStep: cell.stepIndex, steps: new Set<number>(), totalErrors: 0 }
    bucket.firstStep = Math.min(bucket.firstStep, cell.stepIndex)
    bucket.steps.add(cell.stepIndex)
    bucket.totalErrors += cell.errorCount
    byType.set(label, bucket)
  }
  const ordered = [...byType.values()].sort(
    // Unlabelled steps last, otherwise in the order the run reaches them.
    (a, b) =>
      Number(a.label === OTHER_STEPS_LABEL) - Number(b.label === OTHER_STEPS_LABEL) || a.firstStep - b.firstStep,
  )
  const maxTotal = Math.max(0, ...ordered.map((b) => b.totalErrors))
  return ordered.map((bucket) => ({
    label: bucket.label,
    sub: `${bucket.steps.size} ${bucket.steps.size === 1 ? 'step' : 'steps'}`,
    totalErrors: bucket.totalErrors,
    // No errors means no phase is hot.
    isHot: maxTotal > 0 && bucket.totalErrors === maxTotal,
  }))
}

function heatmapColour(intensity: number): string {
  // intensity is 0.0 to 1.0
  if (intensity === 0) return 'var(--card)'
  if (intensity < 0.33) return `rgba(245, 158, 11, ${intensity * 1.5})` // amber
  if (intensity < 0.66) return `rgba(239, 68, 68, ${0.4 + intensity * 0.6})` // red building
  return `rgba(185, 28, 28, ${0.6 + intensity * 0.4})` // deep red
}

export default function StepHeatmap({ heatmap, totalStudents }: StepHeatmapProps) {
  const errorTotalsByAlgorithm = useMemo(() => {
    const map = new Map<string, number>()
    for (const cell of heatmap) {
      map.set(cell.algorithmName, (map.get(cell.algorithmName) ?? 0) + cell.errorCount)
    }
    return map
  }, [heatmap])

  const activeAlgorithmNames = useMemo(
    () =>
      Array.from(errorTotalsByAlgorithm.keys()).sort(
        (a, b) => (errorTotalsByAlgorithm.get(b) ?? 0) - (errorTotalsByAlgorithm.get(a) ?? 0) || a.localeCompare(b),
      ),
    [errorTotalsByAlgorithm],
  )

  const allCurriculumNames = useMemo(() => {
    const activeSet = new Set(activeAlgorithmNames)
    return Object.values(ALGORITHM_REGISTRY)
      .map((entry) => entry.displayName)
      .filter((name) => !activeSet.has(name))
      .sort((a, b) => a.localeCompare(b))
  }, [activeAlgorithmNames])

  const [selectedAlgorithm, setSelectedAlgorithm] = useState(() =>
    activeAlgorithmNames.includes('Bubble Sort')
      ? 'Bubble Sort'
      : (activeAlgorithmNames[0] ?? 'Bubble Sort'),
  )

  const topicCells = useMemo(
    () => heatmap.filter((h) => h.algorithmName === selectedAlgorithm),
    [heatmap, selectedAlgorithm],
  )

  const phases = useMemo(() => buildPhases(topicCells), [topicCells])

  // The per-step strip: one box per step number, whatever was asked there.
  const cells = useMemo(() => {
    const byStep = new Map<number, { stepIndex: number; errorCount: number }>()
    for (const cell of topicCells) {
      const entry = byStep.get(cell.stepIndex) ?? { stepIndex: cell.stepIndex, errorCount: 0 }
      entry.errorCount += cell.errorCount
      byStep.set(cell.stepIndex, entry)
    }
    return [...byStep.values()].sort((a, b) => a.stepIndex - b.stepIndex)
  }, [topicCells])

  const maxPhaseTotal = Math.max(1, ...phases.map((p) => p.totalErrors))
  const totalAlgorithmErrors = cells.reduce((sum, c) => sum + c.errorCount, 0)
  const peakCell = cells.reduce<(typeof cells)[0] | null>(
    (best, c) => (!best || c.errorCount > best.errorCount ? c : best),
    null,
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step Difficulty Heatmap</h2>
          <p className="text-xs text-text-muted">
            Errors grouped by the kind of question students answered, then step by step. Darker means more errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalAlgorithmErrors > 0 && (
            <span className="rounded-full border border-border bg-surface-sunk px-2.5 py-1 text-xs font-medium text-text-secondary">
              {totalAlgorithmErrors} total errors
              {peakCell ? ` (Peak: Step ${peakCell.stepIndex})` : ''}
            </span>
          )}
          <select
            aria-label="Select algorithm for step difficulty heatmap"
            value={selectedAlgorithm}
            onChange={(event) => setSelectedAlgorithm(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-text-primary outline-none"
          >
            {activeAlgorithmNames.length > 0 && (
              <optgroup label={`Topics With Recorded Errors (${activeAlgorithmNames.length})`}>
                {activeAlgorithmNames.map((name) => (
                  <option key={name} value={name}>
                    {name} ({errorTotalsByAlgorithm.get(name) ?? 0} errors)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="All Curriculum Topics">
              {activeAlgorithmNames.length === 0 && (
                <option value="Bubble Sort">Bubble Sort</option>
              )}
              {allCurriculumNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        {cells.length === 0 ? (
          <p className="text-center text-sm text-text-muted">No error data yet for {selectedAlgorithm}.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <div
                className="grid gap-3"
                style={{
                  minHeight: 52,
                  gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))`,
                }}
              >
                {phases.map((phase) => (
                  <div
                    key={phase.label}
                    className="rounded-md border border-border/60 p-2"
                    style={phase.isHot ? { backgroundColor: 'var(--error-light)' } : undefined}
                  >
                    <p className="text-[11px] font-medium text-text-primary">{phase.label}</p>
                    {phase.sub && <p className="text-[10px] text-text-muted">{phase.sub}</p>}
                    {phase.isHot && (
                      <span className="mt-1 inline-block rounded-full bg-tone-rose-bg px-1.5 py-0.5 text-[10px] text-tone-red">
                        High error rate
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="mt-2 grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))`,
                }}
              >
                {phases.map((phase) => {
                  const intensity = phase.totalErrors / maxPhaseTotal
                  return (
                    <Tooltip key={phase.label}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex h-9 items-center justify-center rounded-sm border border-border text-sm font-semibold text-text-primary"
                          style={{ backgroundColor: heatmapColour(intensity) }}
                        >
                          {phase.totalErrors}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {phase.label}: {phase.totalErrors} errors across {totalStudents} students
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2.5 text-xs font-medium text-text-secondary">
                Step-by-Step Error Breakdown ({cells.length} {cells.length === 1 ? 'step' : 'steps'} with errors)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {cells.map((cell) => {
                  const maxErrorCount = Math.max(1, ...cells.map((c) => c.errorCount))
                  const intensity = cell.errorCount / maxErrorCount
                  return (
                    <Tooltip key={cell.stepIndex}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="flex size-10 items-center justify-center rounded-sm border border-border text-xs font-semibold text-text-primary"
                            style={{ backgroundColor: heatmapColour(intensity) }}
                          >
                            {cell.stepIndex}
                          </div>
                          <span className="text-[10px] text-text-muted">{cell.errorCount ?? 0}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Step {cell.stepIndex}: {cell.errorCount} errors across {totalStudents} students
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              {(
                [
                  ['No errors', 'var(--card)'],
                  ['Low', 'rgba(245, 158, 11, 0.3)'],
                  ['Medium', 'rgba(239, 68, 68, 0.5)'],
                  ['High', 'rgba(185, 28, 28, 0.8)'],
                ] as const
              ).map(([label, colour]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm border border-border" style={{ backgroundColor: colour }} />
                  <span className="text-[10px] text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
