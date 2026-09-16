import type { AlgorithmSnapshot, GridAlgorithmState, GridAlgorithmType, GridCell } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

// Indices match PseudocodePanel's grid-* arrays exactly:
//   0: '{algo}(grid, start, end):'
//   1: '  frontier = [start]; g[start] = 0'
//   2: '  while frontier not empty:'
//   3: '    current = pop highest-priority cell from frontier'
//   4: '    if current == end: reconstruct path, done'
//   5: '    for each open 4-directional neighbour:'
//   6: '      relax neighbour, add to frontier'
const PSEUDOCODE_LINE = {
  START: 0,
  INIT: 1,
  LOOP: 2,
  POP: 3,
  CHECK_END: 4,
  FOR_NEIGHBOURS: 5,
  RELAX: 6,
} as const

// Only Dijkstra and A* pause on "which cell next" - plain grid BFS/DFS
// are meant to be watched (the wave/winding-path spectacle), not
// interrupted every few cells.
const PROMPT_EVERY_N_POPS = 4

function key(row: number, col: number): string {
  return `${row},${col}`
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })))
}

function neighboursOf(row: number, col: number, rows: number, cols: number): [number, number][] {
  return ([[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]] as [number, number][]).filter(
    ([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols,
  )
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: GridAlgorithmState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: {
      ...params.state,
      grid: params.state.grid.map((row) => row.map((cell) => ({ ...cell }))),
      frontierCells: [...params.state.frontierCells],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.GRID,
  }
}

const ALGO_LABEL: Record<GridAlgorithmType, string> = {
  bfs: 'BFS',
  dfs: 'DFS',
  dijkstra: 'Dijkstra',
  astar: 'A*',
}

/**
 * Shared core for all four grid pathfinding engines - they're identical
 * except for how the next cell is chosen from the frontier (FIFO for
 * BFS, LIFO for DFS, minimum g(n) for Dijkstra, minimum f(n) = g(n) +
 * Manhattan(n, end) for A*). Unweighted grid (every step costs 1), so
 * BFS and Dijkstra always explore in the same order and both guarantee
 * the shortest path; DFS does not; A* explores far fewer cells than
 * either once the heuristic starts pulling it toward the target.
 */
function runGridSearch(
  algorithmType: GridAlgorithmType,
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const workingGrid = cloneGrid(grid)
  const rows = workingGrid.length
  const cols = workingGrid[0]?.length ?? 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<GridAlgorithmState>): GridAlgorithmState {
    return {
      grid: workingGrid,
      rows,
      cols,
      startCell: [startRow, startCol],
      endCell: [endRow, endCol],
      currentCell: null,
      frontierCells: [],
      visitedCount: 0,
      algorithmType,
      ...overrides,
    }
  }

  if (workingGrid[startRow]?.[startCol]?.state === 'wall' || workingGrid[endRow]?.[endCol]?.state === 'wall') {
    push({
      description: 'The start or end cell is a wall - no run is possible until it is cleared.',
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })
    return snapshots
  }

  workingGrid[startRow][startCol] = { ...workingGrid[startRow][startCol], row: startRow, col: startCol, state: 'start' }
  workingGrid[endRow][endCol] = { ...workingGrid[endRow][endCol], row: endRow, col: endCol, state: 'end' }

  const startKey = key(startRow, startCol)
  const endKey = key(endRow, endCol)
  const gScore = new Map<string, number>([[startKey, 0]])
  const parent = new Map<string, string | null>([[startKey, null]])
  const visited = new Set<string>()
  const inFrontier = new Set<string>([startKey])
  let frontier: [number, number][] = [[startRow, startCol]]
  let visitedCount = 0
  let popsSincePrompt = 0

  push({
    description: `Starting ${ALGO_LABEL[algorithmType]} from (${startRow}, ${startCol}) to (${endRow}, ${endCol}).`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ frontierCells: [...frontier] }),
  })

  function priority(cell: [number, number]): number {
    const g = gScore.get(key(cell[0], cell[1])) ?? Infinity
    if (algorithmType === 'astar') return g + manhattan(cell[0], cell[1], endRow, endCol)
    return g
  }

  function bestFrontierIndex(): number {
    let best = 0
    for (let i = 1; i < frontier.length; i++) {
      if (priority(frontier[i]) < priority(frontier[best])) best = i
    }
    return best
  }

  function popNext(): [number, number] {
    if (algorithmType === 'dfs') return frontier.pop()!
    if (algorithmType === 'bfs') return frontier.shift()!
    return frontier.splice(bestFrontierIndex(), 1)[0]
  }

  let found = false

  while (frontier.length > 0) {
    if ((algorithmType === 'dijkstra' || algorithmType === 'astar') && frontier.length >= 2) {
      popsSincePrompt++
      if (popsSincePrompt % PROMPT_EVERY_N_POPS === 0) {
        push({
          description:
            algorithmType === 'astar'
              ? `Which cell is dequeued next - the one with the lowest f(n) = g(n) + h(n)?`
              : `Which cell is dequeued next - the one with the lowest known distance g(n)?`,
          pseudocodeLine: PSEUDOCODE_LINE.POP,
          isPredictionRequired: true,
          state: baseState({
            frontierCells: [...frontier],
            visitedCount,
          }),
          criticalJunctionType: CriticalJunctionType.GRID_NEXT_CELL,
          junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        })
      }
    }

    const [r, c] = popNext()
    const k = key(r, c)
    inFrontier.delete(k)
    if (visited.has(k)) continue
    visited.add(k)
    visitedCount++

    if (k !== startKey && k !== endKey) workingGrid[r][c] = { ...workingGrid[r][c], state: 'visited' }

    push({
      description: `Visited (${r}, ${c}).`,
      pseudocodeLine: PSEUDOCODE_LINE.LOOP,
      isPredictionRequired: false,
      state: baseState({ currentCell: [r, c], frontierCells: [...frontier], visitedCount }),
    })

    if (k === endKey) {
      found = true
      break
    }

    for (const [nr, nc] of neighboursOf(r, c, rows, cols)) {
      const nk = key(nr, nc)
      if (workingGrid[nr][nc].state === 'wall' || visited.has(nk)) continue
      const newG = (gScore.get(k) ?? 0) + 1
      if (gScore.has(nk) && newG >= gScore.get(nk)!) continue

      gScore.set(nk, newG)
      parent.set(nk, k)
      const h = manhattan(nr, nc, endRow, endCol)
      workingGrid[nr][nc] = { ...workingGrid[nr][nc], gScore: newG, hScore: h, fScore: newG + h, parent: k }
      if (nk !== endKey) workingGrid[nr][nc].state = 'frontier'
      if (!inFrontier.has(nk)) {
        frontier.push([nr, nc])
        inFrontier.add(nk)
      }
    }
  }

  if (!found) {
    push({
      description: 'The entire reachable area was explored and no path to the end cell exists.',
      pseudocodeLine: PSEUDOCODE_LINE.LOOP,
      isPredictionRequired: false,
      state: baseState({ currentCell: null, frontierCells: [], visitedCount }),
      isFinalStep: true,
    })
    return snapshots
  }

  const pathKeys: string[] = []
  let cur: string | null = endKey
  while (cur !== null) {
    pathKeys.unshift(cur)
    cur = parent.get(cur) ?? null
  }
  for (const k of pathKeys) {
    if (k === startKey || k === endKey) continue
    const [r, c] = k.split(',').map(Number)
    workingGrid[r][c] = { ...workingGrid[r][c], state: 'path' }
  }

  push({
    description: `Path found! Length: ${pathKeys.length - 1} steps. Visited ${visitedCount} of ${rows * cols} cells.`,
    pseudocodeLine: PSEUDOCODE_LINE.CHECK_END,
    isPredictionRequired: false,
    state: baseState({ currentCell: [endRow, endCol], frontierCells: [], visitedCount, pathLength: pathKeys.length - 1 }),
    isFinalStep: true,
  })

  return snapshots
}

export function gridBfsEngine(grid: GridCell[][], startRow: number, startCol: number, endRow: number, endCol: number): AlgorithmSnapshot[] {
  return runGridSearch('bfs', grid, startRow, startCol, endRow, endCol)
}

export function gridDfsEngine(grid: GridCell[][], startRow: number, startCol: number, endRow: number, endCol: number): AlgorithmSnapshot[] {
  return runGridSearch('dfs', grid, startRow, startCol, endRow, endCol)
}

export function gridDijkstraEngine(grid: GridCell[][], startRow: number, startCol: number, endRow: number, endCol: number): AlgorithmSnapshot[] {
  return runGridSearch('dijkstra', grid, startRow, startCol, endRow, endCol)
}

export function gridAStarEngine(grid: GridCell[][], startRow: number, startCol: number, endRow: number, endCol: number): AlgorithmSnapshot[] {
  return runGridSearch('astar', grid, startRow, startCol, endRow, endCol)
}

/** Lookup used by GridCanvas to re-run the right engine after the
 * student edits walls, keyed by the same GridAlgorithmType every grid
 * snapshot already carries. */
export const GRID_ENGINES: Record<GridAlgorithmType, typeof gridBfsEngine> = {
  bfs: gridBfsEngine,
  dfs: gridDfsEngine,
  dijkstra: gridDijkstraEngine,
  astar: gridAStarEngine,
}

/** Builds an empty (no walls) starting grid - the default input every
 * grid registry entry and AlgorithmControls' "Clear walls" reuse. */
export function buildEmptyGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({ row, col, state: 'empty' as const })),
  )
}
