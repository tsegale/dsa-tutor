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
 * "Visited (8, 3)." said nothing a student could use: not why that cell
 * and not what happens because of it. Each of the four engines proves a
 * different fact at the moment a cell comes off the frontier - BFS's
 * distance is already final because it explores in rings, DFS's is not
 * because it commits to one branch, Dijkstra's is final because it always
 * takes the closest unvisited cell next, A*'s is a guess weighed by the
 * heuristic rather than a certainty - and that fact is what belongs here,
 * driven from the same g/h the engine already tracked rather than adding
 * new state to read it from.
 */
function visitedDescription(
  r: number,
  c: number,
  algorithmType: GridAlgorithmType,
  g: number,
  h: number,
  isEnd: boolean,
  visitedCount: number,
): string {
  const pos = `(${r}, ${c})`
  const steps = (n: number) => `${n} step${n === 1 ? '' : 's'}`

  if (isEnd) {
    return algorithmType === 'dijkstra' || algorithmType === 'astar'
      ? `Reached the end cell ${pos} at cost ${g} - no cheaper route is possible, so the run stops here and walks the path back.`
      : `Reached the end cell ${pos} after ${steps(visitedCount)} - the run stops here and walks the path back.`
  }

  switch (algorithmType) {
    case 'bfs':
      return `Dequeued ${pos}, ${steps(g)} from the start - BFS explores one ring at a time, so this distance is already final.`
    case 'dfs':
      return `Visited ${pos}, ${steps(g)} down this branch - DFS commits to one path and only backtracks once every neighbour here is a wall or already visited.`
    case 'dijkstra':
      return `Visited ${pos} at distance ${g} - the lowest possible, since Dijkstra always finalises the closest unvisited cell next.`
    case 'astar':
      return `Visited ${pos}: g=${g} travelled so far, h=${h} estimated to go (f=${g + h}) - the lowest f(n) in the frontier, so this is the best guess toward the end right now.`
    default:
      return `Visited ${pos}.`
  }
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

  // Terrain is a property of the board, so it is read once rather than
  // carried as a flag the caller could set inconsistently.
  const weighted = grid.some((row) => row.some((cell) => (cell.weight ?? 1) !== 1))

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
      ...(weighted ? { weighted } : {}),
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
    // All four pathfinders ask this, not only the two weighted ones. Grid
    // BFS and DFS had no junction of any kind, so Practice on them was 562
    // and 33 steps of watching: the mode was offered and never asked
    // anything. What comes off the frontier next is exactly as definite
    // for a queue or a stack as it is for a priority queue, and the
    // contrast between the four answers is the point of this module.
    if (frontier.length >= 2) {
      popsSincePrompt++
      if (popsSincePrompt % PROMPT_EVERY_N_POPS === 0) {
        push({
          description:
            algorithmType === 'astar'
              ? `Which cell is dequeued next - the one with the lowest f(n) = g(n) + h(n)?`
              : algorithmType === 'dijkstra'
                ? `Which cell is dequeued next - the one with the lowest known distance g(n)?`
                : algorithmType === 'bfs'
                  ? `Which cell is dequeued next - the one that has been waiting longest?`
                  : `Which cell is explored next - the one discovered most recently?`,
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
      description: visitedDescription(r, c, algorithmType, gScore.get(k) ?? 0, manhattan(r, c, endRow, endCol), k === endKey, visitedCount),
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
      // Cost of entering the neighbour, which is 1 on an unweighted board
      // - so BFS and DFS, whose boards set no weights, are untouched.
      const newG = (gScore.get(k) ?? 0) + (workingGrid[nr][nc].weight ?? 1)
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

  // On a weighted board the two numbers come apart, and that gap is the
  // lesson: BFS reaches the end in fewer steps along a costlier route.
  const pathCost = pathKeys
    .filter((pathKey) => pathKey !== startKey)
    .reduce((total, pathKey) => {
      const [r, c] = pathKey.split(',').map(Number)
      return total + (grid[r]?.[c]?.weight ?? 1)
    }, 0)

  push({
    description: weighted
      ? `Path found! ${pathKeys.length - 1} steps, cost ${pathCost}. Visited ${visitedCount} of ${rows * cols} cells.`
      : `Path found! Length: ${pathKeys.length - 1} steps. Visited ${visitedCount} of ${rows * cols} cells.`,
    pseudocodeLine: PSEUDOCODE_LINE.CHECK_END,
    isPredictionRequired: false,
    state: baseState({
      currentCell: [endRow, endCol],
      frontierCells: [],
      visitedCount,
      pathLength: pathKeys.length - 1,
      ...(weighted ? { pathCost } : {}),
    }),
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

/**
 * The board Dijkstra and A* open on: the same barriers, but each with a
 * second gap, and the short way through laid with rough ground.
 *
 * On a uniform board Dijkstra IS breadth-first search - every move costs
 * the same, so "nearest unvisited" and "longest waiting" are the same
 * cell, and the two produced identical runs down to the step. Its actual
 * subject, that a cheaper route can be a longer one, had nowhere to
 * happen.
 *
 * Two routes and a costly short one give it somewhere: the direct line
 * is fewest steps and dearest, the detour is longer and cheaper. BFS
 * takes the first, Dijkstra the second, and the difference is on screen
 * rather than asserted.
 */
export function buildTerrainGrid(rows: number, cols: number): GridCell[][] {
  const grid = buildEmptyGrid(rows, cols)
  const barriers = [0.3, 0.55, 0.8].map((fraction) => Math.floor(cols * fraction))
  const direct = Math.floor(rows / 2)
  const detour = 1
  for (const col of barriers) {
    for (let row = 1; row < rows - 1; row++) {
      if (row !== direct && row !== detour) grid[row][col].state = 'wall'
    }
  }
  // Rough ground over the direct line only, between the start and end
  // columns so neither of those is itself expensive to stand on.
  for (let col = 2; col < cols - 2; col++) grid[direct][col].weight = ROUGH_COST
  return grid
}

/**
 * The board A* opens on: larger, mostly open, with scattered blocks and
 * a rough patch rather than barriers across the board.
 *
 * A* and Dijkstra answer the same question and differ only in where they
 * look, so A* has nothing to show on a board that forces a full sweep -
 * on Dijkstra's serpentine it saved 137 cells against 106, which is a
 * footnote. Open ground is where the heuristic bites: here Dijkstra
 * expands 303 of the 336 cells and A* 103, for the identical path cost.
 * Same answer, a third of the work, visible on the canvas.
 */
export const ASTAR_BOARD = { rows: 14, cols: 24, start: [7, 1], end: [7, 22] } as const

export function buildOpenGrid(rows: number, cols: number): GridCell[][] {
  const grid = buildEmptyGrid(rows, cols)
  // Placed as fractions so the shape survives a resize from the controls.
  const blocks: [number, number][] = [
    [0.15, 0.2], [0.25, 0.2], [0.35, 0.2],
    [0.55, 0.38], [0.65, 0.38], [0.75, 0.38], [0.08, 0.38],
    [0.15, 0.55], [0.25, 0.55], [0.35, 0.55], [0.82, 0.55],
    [0.5, 0.68], [0.6, 0.68],
  ]
  for (const [fr, fc] of blocks) {
    const r = Math.round(fr * (rows - 1))
    const c = Math.round(fc * (cols - 1))
    if (grid[r]?.[c]) grid[r][c].state = 'wall'
  }
  // A rough patch straddling the direct line, so the cheapest route bends
  // around it and the cost column still means something here.
  for (let r = Math.round(rows * 0.3); r <= Math.round(rows * 0.55); r++) {
    for (let c = Math.round(cols * 0.42); c <= Math.round(cols * 0.52); c++) {
      if (grid[r]?.[c] && grid[r][c].state !== 'wall') grid[r][c].weight = ROUGH_COST
    }
  }
  const [sr, sc] = ASTAR_BOARD.start
  const [er, ec] = ASTAR_BOARD.end
  for (const [r, c] of [[sr, sc], [er, ec]] as [number, number][]) {
    if (grid[r]?.[c]) { grid[r][c].state = 'empty'; delete grid[r][c].weight }
  }
  return grid
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

/** Builds an empty (no walls) starting grid - what AlgorithmControls'
 * "Clear walls" reuses, and the base the walled default is drawn on. */
export function buildEmptyGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({ row, col, state: 'empty' as const })),
  )
}

/**
 * The board every pathfinder opens on. One definition because three
 * places need it - the registry entry, runFor's switch, and the canvas
 * when it re-runs after an edit - and three copies of 20x35 is how the
 * old size survived a change to any one of them.
 */
export const PATHFINDER_BOARD = { rows: 10, cols: 16, start: [5, 1], end: [5, 14] } as const

/** What a slow cell costs to enter on the weighted boards. */
export const ROUGH_COST = 4

/**
 * Three staggered barriers with a gap at alternating ends, so the only
 * route is a serpentine one.
 *
 * An empty board is the degenerate case for all four pathfinders at
 * once, in opposite directions. BFS and Dijkstra have nothing to stop
 * them, so they flood every cell; A* and DFS have the target straight
 * ahead, so they walk to it in a handful of steps and ask almost
 * nothing. On a 20x35 empty board that was 139 junctions for BFS
 * against 7 for A*.
 *
 * Barriers fix both ends: the flood is channelled, and the heuristic
 * finally has something to steer around, which is the whole of what A*
 * has to teach. Deterministic, because a demo has to run the same way
 * twice - the learner edits from here, and "Clear walls" still empties it.
 */
export function buildWalledGrid(rows: number, cols: number): GridCell[][] {
  const grid = buildEmptyGrid(rows, cols)
  const barriers = [0.3, 0.55, 0.8].map((fraction) => Math.floor(cols * fraction))
  barriers.forEach((col, index) => {
    const gap = index % 2 === 0 ? rows - 2 : 1
    for (let row = 1; row < rows - 1; row++) {
      if (row !== gap) grid[row][col].state = 'wall'
    }
  })
  return grid
}
