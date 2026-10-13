import { useMemo } from 'react'
import { curveStepAfter, line, scaleLinear } from 'd3'
import { ScaffoldingLevel } from '@dsa-tutor/types'
import { SUPPORT_LEVEL } from '@/config/supportLevels'
import { useElementWidth } from '@/hooks/useElementWidth'
import { MIN_CHART_POINTS, levelRuns } from '@/utils/trajectory'

const HEIGHT = 220
const MARGIN = { top: 24, right: 12, bottom: 28, left: 36 }

// More support, deeper shading: the background lightens as support fades,
// which is the mechanism the chart exists to show.
const BAND_OPACITY: Record<string, number> = {
  [ScaffoldingLevel.HIGH]: 1,
  [ScaffoldingLevel.MEDIUM]: 0.65,
  [ScaffoldingLevel.LOW]: 0.35,
  [ScaffoldingLevel.NONE]: 0,
}

interface Point {
  score: number
  level: string
}

const levelLabel = (level: string) => SUPPORT_LEVEL[level as ScaffoldingLevel]?.label ?? level

/**
 * The scaffolding trajectory (Phase 6C): mastery score at each answered
 * prediction as a step line in --brand, with the support level at the time
 * shaded behind it in --surface-sunk. Axes and labels are --ink-3. No canvas
 * state colours: those mean algorithm state. D3 only computes the scales and
 * the path; React renders the SVG. With too few points it is a table.
 */
export function TrajectoryChart({ points }: { points: Point[] }) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const chart = useMemo(() => {
    const x = scaleLinear().domain([0, Math.max(1, points.length)]).range([0, innerWidth])
    const y = scaleLinear().domain([0, 100]).range([innerHeight, 0])
    // Each point holds until the next answer: a step after each prediction.
    const path = line<Point>()
      .x((_, index) => x(index))
      .y((point) => y(point.score))
      .curve(curveStepAfter)([...points, ...(points.length ? [points[points.length - 1]] : [])])
    return { x, y, path, runs: levelRuns(points) }
  }, [points, innerWidth, innerHeight])

  if (points.length < MIN_CHART_POINTS) {
    return (
      <div ref={ref}>
        <p className="text-small text-ink-2">
          {points.length === 0
            ? 'Answer a few predictions in Practice and your mastery and support level will be charted here.'
            : 'Too few answers to chart yet. Your answers so far:'}
        </p>
        {points.length > 0 && (
          <table className="mt-3 w-full max-w-md text-small">
            <thead>
              <tr className="text-left text-micro text-ink-2">
                <th className="py-1 font-medium">Answer</th>
                <th className="py-1 font-medium">Mastery score</th>
                <th className="py-1 font-medium">Support level</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={index} className="border-t border-rule">
                  <td className="py-1 text-mono-sm text-ink tabular-nums">{index + 1}</td>
                  <td className="py-1 text-mono-sm text-ink tabular-nums">{point.score}</td>
                  <td className="py-1 text-ink">{levelLabel(point.level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const { x, y, path, runs } = chart
  const latest = points[points.length - 1]

  return (
    <div ref={ref} className="w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Mastery score over ${points.length} answers, from ${points[0].score} to ${latest.score}, with support now at ${levelLabel(latest.level)}.`}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {runs.map((run) => {
            const bandWidth = x(run.end) - x(run.start)
            return (
              <g key={run.start}>
                <rect x={x(run.start)} y={0} width={bandWidth} height={innerHeight} className="fill-surface-sunk" opacity={BAND_OPACITY[run.level] ?? 0.5} />
                {bandWidth > 72 && (
                  <text x={x(run.start) + 6} y={-8} className="fill-ink-3 text-micro">
                    {levelLabel(run.level)}
                  </text>
                )}
              </g>
            )
          })}
          {[0, 50, 100].map((tick) => (
            <g key={tick}>
              <line x1={0} x2={innerWidth} y1={y(tick)} y2={y(tick)} className="stroke-rule" strokeDasharray={tick === 0 ? undefined : '2 3'} />
              <text x={-8} y={y(tick)} textAnchor="end" dominantBaseline="central" className="fill-ink-3 font-mono text-micro tabular-nums">
                {tick}
              </text>
            </g>
          ))}
          {path && <path d={path} fill="none" strokeWidth={2} className="stroke-brand" />}
          <text x={0} y={innerHeight + 20} className="fill-ink-3 text-micro">
            First answer
          </text>
          <text x={innerWidth} y={innerHeight + 20} textAnchor="end" className="fill-ink-3 text-micro">
            Latest, answer <tspan className="font-mono tabular-nums">{points.length}</tspan>
          </text>
        </g>
      </svg>
    </div>
  )
}
