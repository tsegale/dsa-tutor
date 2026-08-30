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

function heatmapColour(intensity: number): string {
  // intensity is 0.0 to 1.0
  if (intensity === 0) return '#FFFFFF'
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

  const maxErrorCount = Math.max(1, ...cells.map((c) => c.errorCount))

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

      <div className="rounded-md border border-border bg-white p-6">
        {cells.length === 0 ? (
          <p className="text-center text-sm text-text-muted">No error data yet for this algorithm.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {cells.map((cell) => {
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
