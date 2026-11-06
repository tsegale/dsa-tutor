import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { AlgorithmSnapshot, GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import { AppShell } from '@/components/layout/AppShell'
import { useStudyScope } from '@/hooks/useStudyScope'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { linearSearchEngine } from '@/engine/linearSearch'
import { binarySearchEngine } from '@/engine/binarySearch'
import { jumpSearchEngine } from '@/engine/jumpSearch'
import { interpolationSearchEngine } from '@/engine/interpolationSearch'
import { exponentialSearchEngine } from '@/engine/exponentialSearch'
import {
  ASTAR_BOARD,
  buildEmptyGrid,
  buildOpenGrid,
  buildTerrainGrid,
  buildWalledGrid,
  GRID_ENGINES,
} from '@/engine/gridAlgorithms'
import { topicPath } from '@/data/tracks'
import { cn } from '@/lib/utils'

type RaceDomain = 'sorting' | 'searching' | 'pathfinding'

interface DomainOption {
  slug: string
  label: string
  badge: string
}

const SORTING_OPTIONS: DomainOption[] = [
  { slug: 'bubble-sort', label: 'Bubble Sort', badge: 'O(n^2)' },
  { slug: 'selection-sort', label: 'Selection Sort', badge: 'O(n^2)' },
  { slug: 'insertion-sort', label: 'Insertion Sort', badge: 'O(n^2) / O(n) best' },
  { slug: 'shell-sort', label: 'Shell Sort', badge: 'O(n log^2 n)' },
  { slug: 'merge-sort', label: 'Merge Sort', badge: 'O(n log n)' },
  { slug: 'quick-sort', label: 'Quick Sort', badge: 'O(n log n) avg' },
  { slug: 'heap-sort', label: 'Heap Sort', badge: 'O(n log n)' },
  { slug: 'counting-sort', label: 'Counting Sort', badge: 'O(n + k)' },
  { slug: 'radix-sort', label: 'Radix Sort (LSD)', badge: 'O(d(n + k))' },
]

const SEARCHING_OPTIONS: DomainOption[] = [
  { slug: 'linear-search', label: 'Linear Search', badge: 'O(n)' },
  { slug: 'binary-search', label: 'Binary Search', badge: 'O(log n)' },
  { slug: 'jump-search', label: 'Jump Search', badge: 'O(sqrt(n))' },
  { slug: 'interpolation-search', label: 'Interpolation Search', badge: 'O(log log n) avg' },
  { slug: 'exponential-search', label: 'Exponential Search', badge: 'O(log i)' },
]

const PATHFINDING_OPTIONS: DomainOption[] = [
  { slug: 'grid-bfs', label: 'Grid BFS', badge: 'Shortest unweighted' },
  { slug: 'grid-dfs', label: 'Grid DFS', badge: 'Deep branch walk' },
  { slug: 'grid-dijkstra', label: 'Grid Dijkstra', badge: 'Cheapest weighted' },
  { slug: 'grid-astar', label: 'Grid A* Search', badge: 'Heuristic guided' },
]

const SORT_PRESETS: { id: string; label: string; values: number[] }[] = [
  { id: 'random', label: 'Scrambled (10)', values: [38, 14, 72, 9, 55, 23, 84, 47, 19, 61] },
  { id: 'reversed', label: 'Reverse Sorted (Worst)', values: [90, 80, 70, 60, 50, 40, 30, 20, 10, 5] },
  { id: 'nearly', label: 'Nearly Sorted', values: [8, 14, 21, 19, 32, 41, 48, 45, 63, 74] },
  { id: 'dupes', label: 'Few Unique', values: [30, 10, 30, 20, 10, 40, 20, 30, 10, 40] },
  { id: 'sorted', label: 'Already Sorted (Best)', values: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60] },
]

const SEARCH_ARRAY = [2, 5, 9, 14, 19, 24, 31, 38, 45, 53, 62, 71, 84, 96]
const SEARCH_TARGETS: { id: string; label: string; target: number }[] = [
  { id: 'late', label: 'Near End (84)', target: 84 },
  { id: 'early', label: 'Near Start (5)', target: 5 },
  { id: 'mid', label: 'Middle (31)', target: 31 },
  { id: 'missing', label: 'Not Present (99)', target: 99 },
]

type GridPresetId = 'open-blocks' | 'serpentine' | 'terrain' | 'clear'

function buildGridForPreset(preset: GridPresetId): GridCell[][] {
  const { rows, cols, start, end } = ASTAR_BOARD
  const base =
    preset === 'serpentine'
      ? buildWalledGrid(rows, cols)
      : preset === 'terrain'
        ? buildTerrainGrid(rows, cols)
        : preset === 'clear'
          ? buildEmptyGrid(rows, cols)
          : buildOpenGrid(rows, cols)
  base[start[0]][start[1]].state = 'empty'
  base[end[0]][end[1]].state = 'empty'
  return base
}

function runSearchingSlug(slug: string, arr: number[], target: number): AlgorithmSnapshot[] {
  switch (slug) {
    case 'linear-search':
      return linearSearchEngine(arr, target)
    case 'binary-search':
      return binarySearchEngine(arr, target)
    case 'jump-search':
      return jumpSearchEngine(arr, target)
    case 'interpolation-search':
      return interpolationSearchEngine(arr, target)
    case 'exponential-search':
      return exponentialSearchEngine(arr, target)
    default:
      return binarySearchEngine(arr, target)
  }
}

function runPathfindingSlug(slug: string, grid: GridCell[][]): AlgorithmSnapshot[] {
  const [sr, sc] = ASTAR_BOARD.start
  const [er, ec] = ASTAR_BOARD.end
  const cloned = grid.map((r) => r.map((c) => ({ ...c })))
  switch (slug) {
    case 'grid-bfs':
      return GRID_ENGINES.bfs(cloned, sr, sc, er, ec)
    case 'grid-dfs':
      return GRID_ENGINES.dfs(cloned, sr, sc, er, ec)
    case 'grid-dijkstra':
      return GRID_ENGINES.dijkstra(cloned, sr, sc, er, ec)
    case 'grid-astar':
    default:
      return GRID_ENGINES.astar(cloned, sr, sc, er, ec)
  }
}

function extractNumbers(state: unknown): number[] {
  if (Array.isArray(state)) return state.map((v) => Number(v) || 0)
  if (state && typeof state === 'object') {
    const rec = state as Record<string, unknown>
    if (Array.isArray(rec.array)) return rec.array.map((v) => Number(v) || 0)
    if (Array.isArray(rec.input)) return rec.input.map((v) => Number(v) || 0)
  }
  return []
}

interface Telemetry {
  stepsDone: number
  totalSteps: number
  comparisons: number
  mutations: number
  finished: boolean
}

function computeTelemetry(snapshots: AlgorithmSnapshot[], currentTick: number, domain: RaceDomain): Telemetry {
  if (snapshots.length === 0) {
    return { stepsDone: 0, totalSteps: 0, comparisons: 0, mutations: 0, finished: false }
  }
  const clamped = Math.min(currentTick, snapshots.length - 1)
  if (domain === 'pathfinding') {
    const snap = snapshots[clamped]
    const gs = snap?.dataStructureState as GridAlgorithmState | undefined
    let visitedCount = 0
    let pathCount = 0
    if (gs?.grid) {
      for (const row of gs.grid) {
        for (const cell of row) {
          const isCurrent =
            gs.currentCell !== null &&
            gs.currentCell[0] === cell.row &&
            gs.currentCell[1] === cell.col
          if (cell.state === 'visited' || cell.state === 'path' || isCurrent) visitedCount++
          if (cell.state === 'path') pathCount++
        }
      }
    }
    return {
      stepsDone: clamped + 1,
      totalSteps: snapshots.length,
      comparisons: visitedCount,
      mutations: pathCount,
      finished: clamped >= snapshots.length - 1,
    }
  }

  let comparisons = 0
  let mutations = 0
  for (let i = 0; i <= clamped; i++) {
    const s = snapshots[i]
    if (s.comparedIndices.length > 0 || s.activeIndices.length > 0) comparisons++
    if (s.swappedIndices.length > 0) mutations++
  }
  return {
    stepsDone: clamped + 1,
    totalSteps: snapshots.length,
    comparisons,
    mutations,
    finished: clamped >= snapshots.length - 1,
  }
}

function RaceArrayCanvas({ snapshot }: { snapshot: AlgorithmSnapshot | undefined }) {
  const values = useMemo(() => extractNumbers(snapshot?.dataStructureState), [snapshot])
  if (!snapshot || values.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-small text-ink-3">
        No array trace available
      </div>
    )
  }
  const maxVal = Math.max(1, ...values)
  const eliminated = new Set<number>(
    ((snapshot.dataStructureState as { eliminated?: number[] } | undefined)?.eliminated ?? []),
  )
  const w = 520
  const h = 220
  const padX = 24
  const padTop = 28
  const padBottom = 30
  const plotW = w - padX * 2
  const plotH = h - padTop - padBottom
  const gap = 6
  const barW = Math.max(10, (plotW - gap * (values.length - 1)) / values.length)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full select-none" role="img" aria-label="Algorithm race array">
      {values.map((val, idx) => {
        const barH = Math.max(8, (val / maxVal) * plotH)
        const x = padX + idx * (barW + gap)
        const y = h - padBottom - barH
        const isSorted = snapshot.highlightIndices.includes(idx)
        const isSwap = snapshot.swappedIndices.includes(idx)
        const isCompare = snapshot.comparedIndices.includes(idx) || snapshot.activeIndices.includes(idx)
        const isElim = eliminated.has(idx)
        const fill = isSorted
          ? 'var(--state-sorted)'
          : isSwap
            ? 'var(--state-swap)'
            : isCompare
              ? 'var(--state-compare)'
              : 'var(--state-neutral)'
        return (
          <g key={idx}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={fill}
              opacity={isElim ? 0.35 : 1}
            />
            <text
              x={x + barW / 2}
              y={Math.max(14, y - 6)}
              textAnchor="middle"
              className="fill-text-primary font-mono text-[11px] font-semibold dark:fill-dark-text-primary"
            >
              {val}
            </text>
            <text
              x={x + barW / 2}
              y={h - 10}
              textAnchor="middle"
              className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
            >
              {idx}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function RaceGridCanvas({
  snapshot,
  editable,
  onToggleWall,
}: {
  snapshot: AlgorithmSnapshot | undefined
  editable: boolean
  onToggleWall: (r: number, c: number) => void
}) {
  const gs = snapshot?.dataStructureState as GridAlgorithmState | undefined
  if (!gs?.grid || gs.grid.length === 0) {
    return <div className="flex h-56 items-center justify-center text-small text-ink-3">No grid trace available</div>
  }
  const rows = gs.grid.length
  const cols = gs.grid[0].length
  const cellSize = 18
  const w = cols * cellSize + 8
  const h = rows * cellSize + 8
  const [sr, sc] = ASTAR_BOARD.start
  const [er, ec] = ASTAR_BOARD.end

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full select-none" role="img" aria-label="Algorithm race grid">
      {gs.grid.map((row, r) =>
        row.map((cell, c) => {
          const isStart = r === sr && c === sc
          const isEnd = r === er && c === ec
          const isCurrentCell =
            gs.currentCell !== null && gs.currentCell[0] === r && gs.currentCell[1] === c
          let fill = 'var(--surface)'
          if (isStart) fill = 'var(--state-sorted)'
          else if (isEnd) fill = 'var(--state-swap)'
          else if (cell.state === 'wall') fill = 'var(--ink)'
          else if (cell.state === 'path') fill = 'var(--state-sorted)'
          else if (isCurrentCell) fill = 'var(--state-compare)'
          else if (cell.state === 'frontier') fill = 'color-mix(in srgb, var(--state-compare) 40%, var(--surface))'
          else if (cell.state === 'visited') fill = 'color-mix(in srgb, var(--state-current) 38%, var(--surface))'
          else if ((cell.weight ?? 1) > 1) fill = 'var(--surface-sunk)'

          return (
            <g
              key={`${r}-${c}`}
              onClick={editable && !isStart && !isEnd ? () => onToggleWall(r, c) : undefined}
              style={editable && !isStart && !isEnd ? { cursor: 'pointer' } : undefined}
            >
              <rect
                x={4 + c * cellSize}
                y={4 + r * cellSize}
                width={cellSize - 1.5}
                height={cellSize - 1.5}
                rx={2}
                fill={fill}
                stroke="var(--rule)"
                strokeWidth={0.75}
              />
              {(isStart || isEnd) && (
                <text
                  x={4 + c * cellSize + (cellSize - 1.5) / 2}
                  y={4 + r * cellSize + (cellSize - 1.5) / 2 + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: 'var(--state-sorted-ink)', fontSize: 9, fontWeight: 700 }}
                >
                  {isStart ? 'S' : 'E'}
                </text>
              )}
            </g>
          )
        }),
      )}
    </svg>
  )
}

export default function ComparePage() {
  const { restricted } = useStudyScope()

  const [domain, setDomain] = useState<RaceDomain>('sorting')
  const [leftSlug, setLeftSlug] = useState('bubble-sort')
  const [rightSlug, setRightSlug] = useState('quick-sort')

  const [sortValues, setSortValues] = useState<number[]>(SORT_PRESETS[0].values)
  const [customCsv, setCustomCsv] = useState(SORT_PRESETS[0].values.join(', '))
  const [searchTarget, setSearchTarget] = useState<number>(SEARCH_TARGETS[0].target)
  const [gridPreset, setGridPreset] = useState<GridPresetId>('open-blocks')
  const [gridCells, setGridCells] = useState<GridCell[][]>(() => buildGridForPreset('open-blocks'))

  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4 | 8>(2)

  const options = domain === 'sorting' ? SORTING_OPTIONS : domain === 'searching' ? SEARCHING_OPTIONS : PATHFINDING_OPTIONS

  const handleDomainChange = (next: RaceDomain) => {
    setPlaying(false)
    setTick(0)
    setDomain(next)
    if (next === 'sorting') {
      setLeftSlug('bubble-sort')
      setRightSlug('quick-sort')
    } else if (next === 'searching') {
      setLeftSlug('linear-search')
      setRightSlug('binary-search')
    } else {
      setLeftSlug('grid-dijkstra')
      setRightSlug('grid-astar')
    }
  }

  const leftSnapshots = useMemo(() => {
    if (domain === 'sorting') {
      const entry = getAlgorithmRegistryEntry(leftSlug)
      return entry ? entry.engineFunction(sortValues) : []
    }
    if (domain === 'searching') {
      return runSearchingSlug(leftSlug, SEARCH_ARRAY, searchTarget)
    }
    return runPathfindingSlug(leftSlug, gridCells)
  }, [domain, leftSlug, sortValues, searchTarget, gridCells])

  const rightSnapshots = useMemo(() => {
    if (domain === 'sorting') {
      const entry = getAlgorithmRegistryEntry(rightSlug)
      return entry ? entry.engineFunction(sortValues) : []
    }
    if (domain === 'searching') {
      return runSearchingSlug(rightSlug, SEARCH_ARRAY, searchTarget)
    }
    return runPathfindingSlug(rightSlug, gridCells)
  }, [domain, rightSlug, sortValues, searchTarget, gridCells])

  const maxSteps = Math.max(leftSnapshots.length, rightSnapshots.length, 1)

  useEffect(() => {
    if (!playing) return
    if (tick >= maxSteps - 1) {
      setPlaying(false)
      return
    }
    const intervalMs = Math.max(35, Math.round(320 / speedMultiplier))
    const timer = setInterval(() => {
      setTick((prev) => {
        if (prev >= maxSteps - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [playing, tick, maxSteps, speedMultiplier])

  if (restricted) {
    return <Navigate to="/" replace />
  }

  const leftSnap = leftSnapshots[Math.min(tick, Math.max(0, leftSnapshots.length - 1))]
  const rightSnap = rightSnapshots[Math.min(tick, Math.max(0, rightSnapshots.length - 1))]
  const leftStats = computeTelemetry(leftSnapshots, tick, domain)
  const rightStats = computeTelemetry(rightSnapshots, tick, domain)

  const handleApplyCsv = () => {
    const parsed = customCsv
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 999)
      .slice(0, 16)
    if (parsed.length >= 3) {
      setPlaying(false)
      setTick(0)
      setSortValues(parsed)
    }
  }

  const handleToggleWall = (r: number, c: number) => {
    setPlaying(false)
    setTick(0)
    setGridCells((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) =>
          ri === r && ci === c ? { ...cell, state: cell.state === 'wall' ? 'empty' : 'wall' } : cell,
        ),
      ),
    )
  }

  const leftOption = options.find((o) => o.slug === leftSlug) ?? options[0]
  const rightOption = options.find((o) => o.slug === rightSlug) ?? options[1] ?? options[0]

  const leftWins = leftStats.finished && rightStats.totalSteps > leftStats.totalSteps
  const rightWins = rightStats.finished && leftStats.totalSteps > rightStats.totalSteps

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Header & Domain Tabs */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div>
            <p className="text-mono-sm uppercase tracking-wider text-ink-3">Algorithm Race Lab</p>
            <h1 className="mt-1 text-h2 font-semibold text-ink">Side-by-Side Complexity Arena</h1>
            <p className="mt-1 text-small text-ink-2">
              Run two algorithms synchronously on identical inputs to observe asymptotic and structural differences in real time.
            </p>
          </div>
          <div role="tablist" aria-label="Comparison domain" className="inline-flex rounded-sm border border-rule bg-surface-sunk p-0.5">
            {([
              { id: 'sorting', label: 'Sorting' },
              { id: 'searching', label: 'Searching' },
              { id: 'pathfinding', label: 'Grid Pathfinding' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={domain === tab.id}
                onClick={() => handleDomainChange(tab.id)}
                className={cn(
                  'rounded-[4px] px-3 py-1.5 text-small font-medium transition-colors',
                  domain === tab.id ? 'bg-surface text-ink shadow-e1' : 'text-ink-2 hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shared Input & Preset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface p-3">
          {domain === 'sorting' && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-small font-medium text-ink-2">Presets:</span>
                {SORT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPlaying(false)
                      setTick(0)
                      setSortValues(preset.values)
                      setCustomCsv(preset.values.join(', '))
                    }}
                    className="rounded-sm border border-rule bg-surface-sunk px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customCsv}
                  onChange={(e) => setCustomCsv(e.target.value)}
                  aria-label="Custom comma-separated numbers"
                  className="h-8 w-52 rounded-sm border border-rule bg-surface-sunk px-2 font-mono text-[11px] text-ink"
                />
                <button
                  type="button"
                  onClick={handleApplyCsv}
                  className="h-8 rounded-sm bg-brand px-3 text-small font-medium text-primary-foreground hover:bg-brand-hover"
                >
                  Apply
                </button>
              </div>
            </>
          )}

          {domain === 'searching' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-small font-medium text-ink-2">Sorted Input:</span>
              <span className="rounded bg-surface-sunk px-2 py-1 font-mono text-[11px] text-ink">
                [{SEARCH_ARRAY.join(', ')}]
              </span>
              <span className="ml-2 text-small font-medium text-ink-2">Target:</span>
              {SEARCH_TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    setTick(0)
                    setSearchTarget(t.target)
                  }}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    searchTarget === t.target
                      ? 'border-brand bg-brand-soft text-ink'
                      : 'border-rule bg-surface-sunk text-ink-2 hover:text-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {domain === 'pathfinding' && (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-small font-medium text-ink-2">Board:</span>
                {([
                  { id: 'open-blocks', label: 'Open + Obstacles (A* Sweet Spot)' },
                  { id: 'serpentine', label: 'Serpentine Barriers' },
                  { id: 'terrain', label: 'Weighted Rough Terrain' },
                  { id: 'clear', label: 'Empty Grid' },
                ] as const).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setPlaying(false)
                      setTick(0)
                      setGridPreset(b.id)
                      setGridCells(buildGridForPreset(b.id))
                    }}
                    className={cn(
                      'rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      gridPreset === b.id
                        ? 'border-brand bg-brand-soft text-ink'
                        : 'border-rule bg-surface-sunk text-ink-2 hover:text-ink',
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-ink-3">Tip: click any grid square at step 1 to toggle walls on both boards</span>
            </div>
          )}
        </div>

        {/* Synchronized Transport Controls */}
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-rule bg-surface px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              if (tick >= maxSteps - 1) setTick(0)
              setPlaying((p) => !p)
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3.5 text-small font-medium text-primary-foreground hover:bg-brand-hover"
          >
            {playing ? 'Pause' : tick >= maxSteps - 1 ? 'Replay Race' : 'Start Race'}
          </button>
          <button
            type="button"
            disabled={tick <= 0}
            onClick={() => {
              setPlaying(false)
              setTick((t) => Math.max(0, t - 1))
            }}
            className="h-8 rounded-sm border border-rule bg-surface-sunk px-2.5 text-small text-ink disabled:opacity-40"
          >
            Step -1
          </button>
          <button
            type="button"
            disabled={tick >= maxSteps - 1}
            onClick={() => {
              setPlaying(false)
              setTick((t) => Math.min(maxSteps - 1, t + 1))
            }}
            className="h-8 rounded-sm border border-rule bg-surface-sunk px-2.5 text-small text-ink disabled:opacity-40"
          >
            Step +1
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setTick(0)
            }}
            className="h-8 rounded-sm border border-rule bg-surface-sunk px-2.5 text-small text-ink-2 hover:text-ink"
          >
            Reset
          </button>

          <div className="flex min-w-44 flex-1 items-center gap-2 px-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, maxSteps - 1)}
              value={Math.min(tick, Math.max(0, maxSteps - 1))}
              onChange={(e) => {
                setPlaying(false)
                setTick(Number(e.target.value))
              }}
              aria-label="Synchronized race timeline"
              className="w-full accent-brand"
            />
            <span className="shrink-0 font-mono text-[11px] text-ink-2">
              tick {Math.min(tick + 1, maxSteps)} / {maxSteps}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {([1, 2, 4, 8] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={cn(
                  'h-7 rounded-sm px-2 font-mono text-[11px] font-medium',
                  speedMultiplier === spd ? 'bg-brand-soft text-ink font-semibold' : 'text-ink-2 hover:bg-surface-sunk',
                )}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Dual Arena */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            {
              side: 'Left' as const,
              slug: leftSlug,
              setSlug: setLeftSlug,
              option: leftOption,
              snap: leftSnap,
              stats: leftStats,
              winner: leftWins,
            },
            {
              side: 'Right' as const,
              slug: rightSlug,
              setSlug: setRightSlug,
              option: rightOption,
              snap: rightSnap,
              stats: rightStats,
              winner: rightWins,
            },
          ].map(({ side, slug, setSlug, option, snap, stats, winner }) => (
            <section
              key={side}
              aria-label={`${side} contender: ${option.label}`}
              className="flex flex-col rounded-md border border-rule bg-surface shadow-e1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3">
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`${side} algorithm`}
                    value={slug}
                    onChange={(e) => {
                      setPlaying(false)
                      setTick(0)
                      setSlug(e.target.value)
                    }}
                    className="h-8 rounded-sm border border-rule-strong bg-surface-sunk px-2.5 text-small font-semibold text-ink"
                  >
                    {options.map((opt) => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="rounded bg-surface-sunk px-2 py-0.5 font-mono text-[11px] text-ink-2">{option.badge}</span>
                  {winner && (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: 'var(--state-sorted)', color: 'var(--state-sorted-ink)' }}
                    >
                      Finished First
                    </span>
                  )}
                </div>
                <Link to={topicPath(slug)} className="text-[11px] font-medium text-brand hover:underline">
                  Open in Studio &rarr;
                </Link>
              </div>

              <div className="p-3">
                {domain === 'pathfinding' ? (
                  <RaceGridCanvas snapshot={snap} editable={tick === 0 && !playing} onToggleWall={handleToggleWall} />
                ) : (
                  <RaceArrayCanvas snapshot={snap} />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-rule bg-surface-sunk/60 px-4 py-2.5 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-3">Steps</p>
                  <p className="font-mono text-small font-semibold text-ink">
                    {stats.stepsDone} / {stats.totalSteps}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-3">
                    {domain === 'pathfinding' ? 'Cells Visited' : 'Comparisons'}
                  </p>
                  <p className="font-mono text-small font-semibold text-ink">{stats.comparisons}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-3">
                    {domain === 'pathfinding' ? 'Path Cells' : 'Swaps / Writes'}
                  </p>
                  <p className="font-mono text-small font-semibold text-ink">{stats.mutations}</p>
                </div>
              </div>

              <div className="border-t border-rule px-4 py-2 text-[12px] text-ink-2">
                <span className="line-clamp-1">{snap?.description ?? 'Ready to start.'}</span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
