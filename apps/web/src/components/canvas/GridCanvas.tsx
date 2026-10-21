import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import type { GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useHandsOnPick } from '@/hooks/useHandsOnPick'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { GRID_ENGINES, ROUGH_COST } from '@/engine/gridAlgorithms'

interface GridCanvasProps {
  width?: number
  height?: number
}

const CELL_SIZE = 20

// A light board in both themes (see HEX_ALLOWLIST in themeTokens.test.ts),
// so these are the light values of the canvas state tokens as literals:
// start is --state-sorted, end --state-error-text (it carries a label),
// the current-cell stroke --state-compare, and visited is --state-current
// at 30% on white.
const CELL_COLOURS: Record<GridCell['state'], { fill: string; text?: string }> = {
  empty: { fill: '#ffffff' },
  wall: { fill: '#2d3748' },
  start: { fill: '#0e9f6e', text: '#12151c' },
  end: { fill: '#c62828', text: '#ffffff' },
  visited: { fill: '#b6daf3' },
  frontier: { fill: '#fde68a' },
  path: { fill: '#facc15' },
}

// Rough ground is drawn as hatching over the cell rather than as a fill,
// because terrain and search state are independent: a rough cell still
// has to read as frontier, visited or path while staying visibly rough.
const ROUGH_HATCH = '#8a7a52'

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Wall', colour: '#2d3748' },
  { label: 'Frontier', colour: '#fde68a' },
  { label: 'Visited', colour: '#b6daf3' },
  { label: 'Path', colour: '#facc15' },
]

export default function GridCanvas({ width, height }: GridCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  // Hands-on: the frontier cells this junction offers as a choice.
  const pick = useHandsOnPick(snapshot)
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

  // A weighted board shows its scores by default. The junction asks which
  // cell has the lowest one, and on terrain that cannot be read off the
  // picture the way it can when every move costs the same. Keyed on the
  // board rather than every render, so turning them off within a topic
  // sticks.
  const weighted = state?.weighted ?? false
  useEffect(() => setShowScores(weighted), [weighted])

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

  const progressColorClass = progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

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
          <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{progressPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
          {weighted && (
            <div className="flex items-center gap-1">
              <svg width="8" height="8" aria-hidden="true">
                <rect width="8" height="8" fill="url(#rough-ground)" opacity={0.55} />
              </svg>
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">
                Rough (costs {ROUGH_COST})
              </span>
            </div>
          )}
          {(state.algorithmType === 'astar' || state.algorithmType === 'dijkstra') && (
            <label className="flex items-center gap-1 text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
              <input type="checkbox" checked={showScores} onChange={(e) => setShowScores(e.target.checked)} className="size-3" />
              {state.algorithmType === 'astar' ? 'Show f' : 'Show g'}
            </label>
          )}
          {isEditable && (
            <button
              type="button"
              onClick={handleClearWalls}
              className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-surface-sunk dark:border-dark-border dark:text-dark-text-secondary"
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
          <defs>
            <pattern id="rough-ground" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke={ROUGH_HATCH} strokeWidth="1.5" />
            </pattern>
          </defs>
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const colours = CELL_COLOURS[cell.state]
              const isCurrent = state.currentCell?.[0] === r && state.currentCell?.[1] === c
              // Hands-on: a frontier cell this junction lets the learner
              // choose. The dashed outline is drawn below, over the fill,
              // so it reads on any cell state.
              const canPick = pick.selectable(`${r},${c}`)
              return (
                <motion.rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  animate={{ fill: colours.fill }}
                  stroke={canPick ? 'var(--state-compare)' : isCurrent ? '#cc8200' : cell.state === 'empty' ? '#e2e8f0' : 'none'}
                  strokeWidth={canPick ? 2.5 : isCurrent ? 2 : 0.5}
                  strokeDasharray={canPick ? '3 2' : undefined}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                  style={{ cursor: canPick || isEditable ? 'pointer' : 'default' }}
                  role={canPick ? 'button' : undefined}
                  aria-label={canPick ? `Choose cell row ${r}, column ${c}` : undefined}
                  onClick={canPick ? () => pick.pick(`${r},${c}`) : undefined}
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
          {/* Terrain, over the state fill and under the scores. */}
          {state.grid.map((row, r) =>
            row.map((cell, c) =>
              (cell.weight ?? 1) > 1 && cell.state !== 'wall' ? (
                <rect
                  key={`rough-${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill="url(#rough-ground)"
                  opacity={0.55}
                  pointerEvents="none"
                />
              ) : null,
            ),
          )}
          {showScores &&
            cellSize >= 14 &&
            state.grid.map((row, r) =>
              row.map((cell, c) => {
                // The number each algorithm actually pops by, not always
                // f: Dijkstra orders on g, and printing g + h beside a
                // prompt asking for the lowest g invited the student to
                // check the wrong column.
                const score = state.algorithmType === 'astar' ? cell.fScore : cell.gScore
                if (score === undefined || (cell.state !== 'frontier' && cell.state !== 'visited')) return null
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
                    {score}
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
          {/* Steps and cost come apart on terrain, and that gap is the
              point: the shortest route is not the cheapest one. */}
          {state.pathCost !== undefined && ` · Path cost: ${state.pathCost}`}
        </p>
      </div>
    </div>
  )
}
