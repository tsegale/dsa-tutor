import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType } from '@dsa-tutor/types'
import type { GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import {
  useAlgorithmStore,
  selectCurrentSnapshot,
  selectIsUnansweredJunction,
  selectProgressPercent,
} from '@/store/useAlgorithmStore'
import { useHandsOnPick } from '@/hooks/useHandsOnPick'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { GRID_ENGINES, ROUGH_COST } from '@/engine/gridAlgorithms'

interface GridCanvasProps {
  width?: number
  height?: number
}

const CELL_SIZE = 20
const RULER_SIZE = 18

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
  const unansweredJunction = useAlgorithmStore(selectIsUnansweredJunction)
  const stepIndex = useAlgorithmStore((s) => s.stepIndex)
  const mode = useAlgorithmStore((s) => s.mode)
  const setAlgorithm = useAlgorithmStore((s) => s.setAlgorithm)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as GridAlgorithmState | undefined

  const isPainting = useRef(false)
  const paintMode = useRef<'wall' | 'erase'>('wall')
  const [error, setError] = useState<string | null>(null)
  const [showScores, setShowScores] = useState(false)

  // A weighted board shows its scores by default. Keyed on the board rather
  // than every render, so turning them off within a topic sticks.
  const weighted = state?.weighted ?? false
  useEffect(() => setShowScores(weighted), [weighted])

  // Only editable before the algorithm has taken any step - once it's
  // running, the wall layout is fixed for that run (matching every other
  // algorithm's "Reset to edit" convention: step back to 0 to change input).
  const isEditable = mode !== AlgorithmMode.PRACTICE && stepIndex === 0

  const svgWidth = width && width > 0 ? width : state ? state.cols * CELL_SIZE + RULER_SIZE : 700
  const svgHeight = height && height > 0 ? height - 40 : state ? state.rows * CELL_SIZE + RULER_SIZE : 400

  const cellSize = useMemo(() => {
    if (!state) return CELL_SIZE
    return Math.max(
      8,
      Math.min((svgWidth - RULER_SIZE - 4) / state.cols, (svgHeight - RULER_SIZE - 4) / state.rows),
    )
  }, [state, svgWidth, svgHeight])

  function regenerate(grid: GridCell[][]) {
    if (!state) return
    const engine = GRID_ENGINES[state.algorithmType]
    if (!engine) return
    const snapshots = engine(grid, state.startCell[0], state.startCell[1], state.endCell[0], state.endCell[1])
    setAlgorithm(algorithmName, snapshots)
  }

  function toggleCell(row: number, col: number, modeToUse: 'wall' | 'erase') {
    if (!state || !isEditable) return
    const [sr, sc] = state.startCell
    const [er, ec] = state.endCell
    if ((row === sr && col === sc) || (row === er && col === ec)) return
    const current = state.grid[row]?.[col]
    if (!current) return
    const nextState: GridCell['state'] = modeToUse === 'wall' ? 'wall' : 'empty'
    if (current.state === nextState) return
    const grid = state.grid.map((r) => r.map((c) => ({ ...c })))
    grid[row][col] = { ...grid[row][col], state: nextState }
    regenerate(grid)
  }

  function handlePointerDown(row: number, col: number, rightClick: boolean) {
    if (!isEditable) return
    const current = state?.grid[row]?.[col]
    const nextMode = rightClick || current?.state === 'wall' ? 'erase' : 'wall'
    paintMode.current = nextMode
    isPainting.current = true
    toggleCell(row, col, nextMode)
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

  const progressColorClass =
    progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  if (!state) {
    return (
      <svg width={svgWidth} height={svgHeight} role="img" aria-label="No algorithm loaded">
        <text
          x={svgWidth / 2}
          y={svgHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-muted text-sm dark:fill-dark-text-secondary"
        >
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}`
  const gridPixelWidth = state.cols * cellSize + RULER_SIZE
  const gridPixelHeight = state.rows * cellSize + RULER_SIZE
  const atNextCellQuestion =
    unansweredJunction && snapshot?.criticalJunctionType === CriticalJunctionType.GRID_NEXT_CELL
  const hideFrontierFScore = atNextCellQuestion && state.algorithmType === 'astar'
  // Dijkstra's question is the frontier's g itself, so at that moment only
  // settled cells keep their numbers - the ones a frontier distance is
  // worked out from.
  const hideFrontierG = atNextCellQuestion && state.algorithmType === 'dijkstra'

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[90px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
            {progressPercent}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
              <input
                type="checkbox"
                checked={showScores}
                onChange={(e) => setShowScores(e.target.checked)}
                className="size-3"
              />
              {state.algorithmType === 'astar' ? (hideFrontierFScore ? 'Show g' : 'Show f') : 'Show g'}
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

      <div className="flex flex-1 items-center justify-center overflow-auto p-1">
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

          {/* Column coordinate ruler (0..cols-1) */}
          {Array.from({ length: state.cols }, (_, c) => {
            const showTick = cellSize >= 16 || c % 2 === 0
            if (!showTick) return null
            return (
              <text
                key={`col-ruler-${c}`}
                x={RULER_SIZE + c * cellSize + cellSize / 2}
                y={RULER_SIZE / 2 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.min(9, Math.max(7, cellSize * 0.42))}
                className="fill-text-muted font-mono select-none dark:fill-dark-text-secondary"
              >
                {c}
              </text>
            )
          })}

          {/* Row coordinate ruler (0..rows-1) */}
          {Array.from({ length: state.rows }, (_, r) => {
            const showTick = cellSize >= 14 || r % 2 === 0
            if (!showTick) return null
            return (
              <text
                key={`row-ruler-${r}`}
                x={RULER_SIZE - 4}
                y={RULER_SIZE + r * cellSize + cellSize / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={Math.min(9, Math.max(7, cellSize * 0.42))}
                className="fill-text-muted font-mono select-none dark:fill-dark-text-secondary"
              >
                {r}
              </text>
            )
          })}

          <g transform={`translate(${RULER_SIZE}, ${RULER_SIZE})`}>
            {state.grid.map((row, r) =>
              row.map((cell, c) => {
                const colours = CELL_COLOURS[cell.state]
                const isCurrent = state.currentCell?.[0] === r && state.currentCell?.[1] === c
                const canPick = pick.selectable(`${r},${c}`)
                return (
                  <motion.rect
                    key={`${r}-${c}`}
                    x={c * cellSize}
                    y={r * cellSize}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    animate={{ fill: colours.fill }}
                    stroke={
                      canPick
                        ? 'var(--state-compare)'
                        : isCurrent
                          ? '#cc8200'
                          : cell.state === 'empty'
                            ? '#e2e8f0'
                            : 'none'
                    }
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

            {/* Terrain hatching */}
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

            {/* Start / End markers */}
            {cellSize >= 13 && (
              <>
                <text
                  x={state.startCell[1] * cellSize + cellSize / 2}
                  y={state.startCell[0] * cellSize + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(10, cellSize * 0.55)}
                  fontWeight={700}
                  fill={CELL_COLOURS.start.text}
                  pointerEvents="none"
                >
                  S
                </text>
                <text
                  x={state.endCell[1] * cellSize + cellSize / 2}
                  y={state.endCell[0] * cellSize + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(10, cellSize * 0.55)}
                  fontWeight={700}
                  fill={CELL_COLOURS.end.text}
                  pointerEvents="none"
                >
                  E
                </text>
              </>
            )}

            {/* Cell scores: hide fScore on frontier during unanswered A* prediction so g + h isn't leaked */}
            {showScores &&
              cellSize >= 14 &&
              state.grid.map((row, r) =>
                row.map((cell, c) => {
                  const score =
                    state.algorithmType === 'astar'
                      ? hideFrontierFScore && cell.state === 'frontier'
                        ? cell.gScore
                        : cell.fScore
                      : hideFrontierG && cell.state === 'frontier'
                        ? undefined
                        : cell.gScore
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
          </g>
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
          Start: ({state.startCell[0]}, {state.startCell[1]}) · Goal: ({state.endCell[0]}, {state.endCell[1]}) · Visited:{' '}
          {state.visitedCount}
          {state.pathLength !== undefined && ` · Path length: ${state.pathLength}`}
          {state.pathCost !== undefined && ` · Path cost: ${state.pathCost}`}
        </p>
      </div>
    </div>
  )
}
