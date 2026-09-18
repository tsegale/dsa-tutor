import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import type { GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { GRID_ENGINES } from '@/engine/gridAlgorithms'

interface GridCanvasProps {
  width?: number
  height?: number
}

const CELL_SIZE = 20

const CELL_COLOURS: Record<GridCell['state'], { fill: string; text?: string }> = {
  empty: { fill: '#ffffff' },
  wall: { fill: '#2d3748' },
  start: { fill: '#16a34a', text: '#ffffff' },
  end: { fill: '#dc2626', text: '#ffffff' },
  visited: { fill: '#c7d2fe' },
  frontier: { fill: '#fde68a' },
  path: { fill: '#facc15' },
}

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Wall', colour: '#2d3748' },
  { label: 'Frontier', colour: '#fde68a' },
  { label: 'Visited', colour: '#c7d2fe' },
  { label: 'Path', colour: '#facc15' },
]

export default function GridCanvas({ width, height }: GridCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const stepIndex = useAlgorithmStore((s) => s.stepIndex)
  const mode = useAlgorithmStore((s) => s.mode)
  const setAlgorithm = useAlgorithmStore((s) => s.setAlgorithm)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as GridAlgorithmState | undefined

  const isPainting = useRef(false)
  const paintMode = useRef<'wall' | 'erase'>('wall')
  const [error, setError] = useState<string | null>(null)
  const [showScores, setShowScores] = useState(false)

  // Only editable before the algorithm has taken any step - once it's
  // running, the wall layout is fixed for that run (matching every other
  // algorithm's "Reset to edit" convention: step back to 0 to change input).
  const isEditable = mode !== AlgorithmMode.PRACTICE && stepIndex === 0

  const svgWidth = width && width > 0 ? width : (state ? state.cols * CELL_SIZE : 700)
  const svgHeight = height && height > 0 ? height - 40 : (state ? state.rows * CELL_SIZE : 400)

  const cellSize = useMemo(() => {
    if (!state) return CELL_SIZE
    return Math.max(6, Math.min(svgWidth / state.cols, svgHeight / state.rows))
  }, [state, svgWidth, svgHeight])

  function regenerate(grid: GridCell[][]) {
    if (!state) return
    const engine = GRID_ENGINES[state.algorithmType]
    if (!engine) return
    const snapshots = engine(grid, state.startCell[0], state.startCell[1], state.endCell[0], state.endCell[1])
    setAlgorithm(algorithmName, snapshots)
  }

  function toggleCell(row: number, col: number, mode: 'wall' | 'erase') {
    if (!state || !isEditable) return
    const [sr, sc] = state.startCell
    const [er, ec] = state.endCell
    if ((row === sr && col === sc) || (row === er && col === ec)) return
    const current = state.grid[row]?.[col]
    if (!current) return
    const nextState: GridCell['state'] = mode === 'wall' ? 'wall' : 'empty'
    if (current.state === nextState) return
    const grid = state.grid.map((r) => r.map((c) => ({ ...c })))
    grid[row][col] = { ...grid[row][col], state: nextState }
    regenerate(grid)
  }

  function handlePointerDown(row: number, col: number, rightClick: boolean) {
    if (!isEditable) return
    const current = state?.grid[row]?.[col]
    const mode = rightClick || current?.state === 'wall' ? 'erase' : 'wall'
    paintMode.current = mode
    isPainting.current = true
    toggleCell(row, col, mode)
  }

  function handlePointerEnter(row: number, col: number) {
    if (!isPainting.current) return
    toggleCell(row, col, paintMode.current)
  }

  function handlePointerUp() {
    isPainting.current = false
  }

  function handleClearWalls() {
    if (!state || !isEditable) return
    const grid = state.grid.map((r) => r.map((c) => (c.state === 'wall' ? { ...c, state: 'empty' as const } : { ...c })))
    setError(null)
    regenerate(grid)
  }

  const progressColorClass = progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
    return (
      <svg width={svgWidth} height={svgHeight} role="img" aria-label="No algorithm loaded">
        <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`
  const gridPixelWidth = state.cols * cellSize
  const gridPixelHeight = state.rows * cellSize

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{progressPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
          {(state.algorithmType === 'astar' || state.algorithmType === 'dijkstra') && (
            <label className="flex items-center gap-1 text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
              <input type="checkbox" checked={showScores} onChange={(e) => setShowScores(e.target.checked)} className="size-3" />
              Show f/g/h
            </label>
          )}
          {isEditable && (
            <button
              type="button"
              onClick={handleClearWalls}
              className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-surface dark:border-dark-border dark:text-dark-text-secondary"
            >
              Clear walls
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto pt-9">
        {error && <p className="px-3 text-xs text-error">{error}</p>}
        <svg
          width={gridPixelWidth}
          height={gridPixelHeight}
          role="img"
          aria-label={canvasLabel}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const colours = CELL_COLOURS[cell.state]
              const isCurrent = state.currentCell?.[0] === r && state.currentCell?.[1] === c
              return (
                <motion.rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  animate={{ fill: colours.fill }}
                  stroke={isCurrent ? '#f59e0b' : cell.state === 'empty' ? '#e2e8f0' : 'none'}
                  strokeWidth={isCurrent ? 2 : 0.5}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                  style={{ cursor: isEditable ? 'pointer' : 'default' }}
                  onPointerDown={(e) => handlePointerDown(r, c, e.button === 2)}
                  onPointerEnter={() => handlePointerEnter(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    handlePointerDown(r, c, true)
                  }}
                />
              )
            }),
          )}
          {showScores &&
            cellSize >= 14 &&
            state.grid.map((row, r) =>
              row.map((cell, c) => {
                if (cell.fScore === undefined || (cell.state !== 'frontier' && cell.state !== 'visited')) return null
                return (
                  <text
                    key={`score-${r}-${c}`}
                    x={c * cellSize + cellSize / 2}
                    y={r * cellSize + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(8, cellSize / 3)}
                    fill="#1e293b"
                    pointerEvents="none"
                  >
                    {cell.fScore}
                  </text>
                )
              }),
            )}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">{snapshot?.description}</p>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
          Visited: {state.visitedCount}
          {state.pathLength !== undefined && ` · Path length: ${state.pathLength}`}
        </p>
      </div>
    </div>
  )
}
