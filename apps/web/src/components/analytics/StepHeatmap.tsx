import { useMemo, useState } from 'react'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface StepHeatmapProps {
  heatmap: EducatorAnalyticsDto['stepDifficultyHeatmap']
  // Not part of the heatmap array itself, but required by the spec's
  // tooltip copy ("... across {totalStudents} students") - passed down
  // separately from the page's analytics.totalStudents.
  totalStudents: number
}

const BUBBLE_SORT_PHASES = [
  { label: '1. Initialisation', sub: 'Setup', isHot: false, stepRange: [0, 0] },
  { label: '2. Outer loop', sub: 'Pass start', isHot: false, stepRange: [1, 10] },
  { label: '3. Comparison check', sub: null, isHot: true, stepRange: [11, 50] },
  { label: '4. Pointer swap', sub: 'If needed', isHot: false, stepRange: [51, 70] },
  { label: '5. Pass boundary', sub: 'Invariant check', isHot: false, stepRange: [71, 999] },
] as const

function heatmapColour(intensity: number): string {
  // intensity is 0.0 to 1.0
  if (intensity === 0) return 'var(--card)'
  if (intensity < 0.33) return `rgba(245, 158, 11, ${intensity * 1.5})` // amber
  if (intensity < 0.66) return `rgba(239, 68, 68, ${0.4 + intensity * 0.6})` // red building
  return `rgba(185, 28, 28, ${0.6 + intensity * 0.4})` // deep red
}

export default function StepHeatmap({ heatmap, totalStudents }: StepHeatmapProps) {
  const algorithmNames = useMemo(
    () => Array.from(new Set(heatmap.map((h) => h.algorithmName))).sort(),
    [heatmap],
  )

  const [selectedAlgorithm, setSelectedAlgorithm] = useState(() =>
    algorithmNames.includes('Bubble Sort') ? 'Bubble Sort' : (algorithmNames[0] ?? 'Bubble Sort'),
  )

  const cells = heatmap
    .filter((h) => h.algorithmName === selectedAlgorithm)
    .sort((a, b) => a.stepIndex - b.stepIndex)

  const isBubbleSort = selectedAlgorithm === 'Bubble Sort'

  const phaseTotals = BUBBLE_SORT_PHASES.map((phase) =>
    cells
      .filter((c) => c.stepIndex >= phase.stepRange[0] && c.stepIndex <= phase.stepRange[1])
      .reduce((sum, c) => sum + c.errorCount, 0),
  )
  const maxPhaseTotal = Math.max(1, ...phaseTotals)

  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step Difficulty Heatmap</h2>
          <p className="text-xs text-text-muted">Darker cells indicate higher error frequency at that algorithm step</p>
        </div>
        <select
          value={selectedAlgorithm}
          onChange={(event) => setSelectedAlgorithm(event.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none"
        >
          {(algorithmNames.length > 0 ? algorithmNames : ['Bubble Sort']).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        {cells.length === 0 ? (
          <p className="text-center text-sm text-text-muted">No error data yet for this algorithm.</p>
        ) : isBubbleSort ? (
          <div>
            <div className="grid grid-cols-5 gap-3" style={{ minHeight: 52 }}>
              {BUBBLE_SORT_PHASES.map((phase) => (
                <div
                  key={phase.label}
                  className="rounded-md p-2"
                  style={phase.isHot ? { backgroundColor: 'var(--error-light)' } : undefined}
                >
                  <p className="text-[10px] font-medium text-text-primary">{phase.label}</p>
                  {phase.sub && <p className="text-[10px] text-text-muted">{phase.sub}</p>}
                  {phase.isHot && (
                    <span className="mt-1 inline-block rounded-full bg-tone-rose-bg px-1.5 py-0.5 text-[10px] text-tone-red">
                      High error rate
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-5 gap-3">
              {BUBBLE_SORT_PHASES.map((phase, i) => {
                const total = phaseTotals[i]
                const intensity = total / maxPhaseTotal
                return (
                  <Tooltip key={phase.label}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex h-9 items-center justify-center rounded-sm border border-border text-sm font-semibold text-text-primary"
                        style={{ backgroundColor: heatmapColour(intensity) }}
                      >
                        {total}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {phase.label}: {total} errors across {totalStudents} students
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-4">
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
        ) : (
          <div className="flex flex-wrap gap-3">
            {cells.map((cell) => {
              const maxErrorCount = Math.max(1, ...cells.map((c) => c.errorCount))
              const intensity = cell.errorCount / maxErrorCount
              return (
                <Tooltip key={cell.stepIndex}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex size-12 items-center justify-center rounded-sm border border-border text-sm font-semibold text-text-primary"
                        style={{ backgroundColor: heatmapColour(intensity) }}
                      >
                        {cell.stepIndex}
                      </div>
                      <span className="text-[11px] text-text-muted">{cell.errorCount ?? 0}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Step {cell.stepIndex}: {cell.errorCount} errors across {totalStudents} students
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
