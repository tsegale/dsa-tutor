import { motion } from 'framer-motion'
import {
  useAlgorithmStore,
  selectCurrentSnapshot,
  selectIsUnansweredJunction,
  selectProgressPercent,
} from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { MatrixState } from '@/engine/floydWarshall'
import { useResolveColour } from './useResolveColour'

interface MatrixCanvasProps {
  width?: number
  height?: number
}

const CELL_SIZE = 44

export default function MatrixCanvas({ width = 600, height = 400 }: MatrixCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const unansweredJunction = useAlgorithmStore(selectIsUnansweredJunction)
  const prefersReducedMotion = useReducedMotion()
  const resolveColour = useResolveColour()
  const state = snapshot?.dataStructureState as MatrixState | undefined

  const progressColorClass =
    progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  if (!state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-muted text-sm dark:fill-dark-text-secondary"
        >
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const n = state.nodeIds.length
  const updatedSet = new Set(state.updated.map(([i, j]) => `${i},${j}`))
  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}`

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5 dark:border-dark-border">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
        <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          {progressPercent}%
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-3">
        {state.k !== null && (
          <p className="mb-2 text-[12px] text-text-secondary dark:text-dark-text-secondary">
            Intermediate vertex k = <strong>{state.nodeIds[state.k]}</strong>: trying dist[i][{state.nodeIds[state.k]}] + dist[
            {state.nodeIds[state.k]}][j] {'<'} dist[i][j]
          </p>
        )}
        <svg width={(n + 1) * CELL_SIZE} height={(n + 1) * CELL_SIZE} role="img" aria-label={canvasLabel}>
          {/* Column headers */}
          {state.nodeIds.map((id, j) => (
            <text
              key={`col-${id}`}
              x={(j + 1.5) * CELL_SIZE}
              y={CELL_SIZE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-text-primary text-[13px] font-semibold dark:fill-dark-text-primary"
            >
              {id}
            </text>
          ))}
          {/* Row headers + matrix cells */}
          {state.nodeIds.map((rowId, i) => (
            <g key={`row-${rowId}`}>
              <text
                x={CELL_SIZE / 2}
                y={(i + 1.5) * CELL_SIZE}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-text-primary text-[13px] font-semibold dark:fill-dark-text-primary"
              >
                {rowId}
              </text>
              {state.nodeIds.map((_, j) => {
                const isActive = state.i === i && state.j === j
                const isUpdated = !isActive && updatedSet.has(`${i},${j}`)
                const value = state.dist[i][j]
                const fill = isActive
                  ? 'var(--state-compare)'
                  : isUpdated
                    ? 'var(--state-sorted)'
                    : i === j
                      ? 'var(--surface-sunk)'
                      : 'var(--surface)'
                const textFill = isActive
                  ? 'var(--state-compare-ink)'
                  : isUpdated
                    ? 'var(--state-sorted-ink)'
                    : 'var(--ink-2)'
                return (
                  <g key={`cell-${i}-${j}`}>
                    <motion.rect
                      x={(j + 1) * CELL_SIZE}
                      y={(i + 1) * CELL_SIZE}
                      width={CELL_SIZE - 2}
                      height={CELL_SIZE - 2}
                      rx={4}
                      animate={{ fill: resolveColour(fill) }}
                      stroke="var(--rule-strong)"
                      strokeWidth={1}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                    />
                    <text
                      x={(j + 1.5) * CELL_SIZE}
                      y={(i + 1.5) * CELL_SIZE}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fill: textFill, fontSize: 12, fontWeight: isActive || isUpdated ? 700 : 500 }}
                    >
                      {value === Infinity ? '∞' : value}
                    </text>
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.i !== null && state.j !== null
            ? unansweredJunction
              ? `Evaluating dist[${state.nodeIds[state.i]}][${state.nodeIds[state.j]}]`
              : `Comparing dist[${state.nodeIds[state.i]}][${state.nodeIds[state.j]}]${
                  updatedSet.has(`${state.i},${state.j}`) ? ' - shorter route found' : ' - current route stays shortest'
                }`
            : "Matrix initialised from the graph's direct edges."}
          {state.k !== null && ` · pass ${state.k + 1} of ${n}`}
        </p>
      </div>
    </div>
  )
}
