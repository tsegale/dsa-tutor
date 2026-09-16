import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { MatrixState } from '@/engine/floydWarshall'

interface MatrixCanvasProps {
  width?: number
  height?: number
}

const CELL_SIZE = 44

export default function MatrixCanvas({ width = 600, height = 400 }: MatrixCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as MatrixState | undefined

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const n = state.nodeIds.length
  const updatedSet = new Set(state.updated.map(([i, j]) => `${i},${j}`))
  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
        <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{masteryPercent}%</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-auto pt-9">
        {state.k !== null && (
          <p className="mb-2 text-[12px] text-text-secondary dark:text-dark-text-secondary">
            Intermediate vertex k = <strong>{state.nodeIds[state.k]}</strong>: trying dist[i][{state.nodeIds[state.k]}] + dist[{state.nodeIds[state.k]}][j] {'<'} dist[i][j]
          </p>
        )}
        <svg
          width={(n + 1) * CELL_SIZE}
          height={(n + 1) * CELL_SIZE}
          role="img"
          aria-label={canvasLabel}
        >
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
                const isUpdated = updatedSet.has(`${i},${j}`)
                const value = state.dist[i][j]
                const fill = isActive ? '#f59e0b' : isUpdated ? '#16a34a' : i === j ? '#f1f5f9' : '#ffffff'
                const textFill = isActive || isUpdated ? '#ffffff' : '#334155'
                return (
                  <g key={`cell-${i}-${j}`}>
                    <motion.rect
                      x={(j + 1) * CELL_SIZE}
                      y={(i + 1) * CELL_SIZE}
                      width={CELL_SIZE - 2}
                      height={CELL_SIZE - 2}
                      rx={4}
                      animate={{ fill }}
                      stroke="#cbd5e1"
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
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">{snapshot?.description}</p>
      </div>
    </div>
  )
}
