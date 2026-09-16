import type { AlgorithmSnapshot, GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import { CanvasType, PredictionType } from '@dsa-tutor/types'

// Indices match PseudocodePanel's 'maze-generation' array exactly:
//   0: 'generate_maze(rows, cols):'
//   1: '  every cell starts a wall'
//   2: '  carve the starting cell; push it onto a stack'
//   3: '  while stack not empty:'
//   4: '    if the current cell has an unvisited neighbour two cells away:'
//   5: '      carve the wall between them and the neighbour; push the neighbour'
//   6: '    else: backtrack (pop the stack)'
const PSEUDOCODE_LINE = { START: 0, INIT: 1, CARVE_START: 2, LOOP: 3, CHECK_NEIGHBOUR: 4, CARVE: 5, BACKTRACK: 6 } as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  state: GridAlgorithmState
  isFinalStep?: boolean
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    // Maze generation has no prediction junctions - Demo and Hands-On
    // only, per spec: watching the carve is the point, not predicting it.
    isPredictionRequired: false,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, grid: params.state.grid.map((row) => row.map((cell) => ({ ...cell }))), frontierCells: [...params.state.frontierCells] },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: null,
    junctionDifficulty: null,
    canvasType: CanvasType.GRID,
  }
}

/** Every maze lives on a full `rows x cols` GridCell grid, but only even
 * (row, col) positions are logical "cells" - odd positions are the
 * walls between them, carved open when two adjacent cells connect. This
 * is the standard way to represent a perfect maze (exactly one path
 * between any two cells) on a uniform cell grid, rather than needing a
 * separate half-resolution data structure. */
function cellRows(rows: number): number {
  return Math.ceil(rows / 2)
}
function cellCols(cols: number): number {
  return Math.ceil(cols / 2)
}
function toGrid(cellRow: number, cellCol: number): [number, number] {
  return [cellRow * 2, cellCol * 2]
}

function buildAllWallsGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => ({ row, col, state: 'wall' as const })))
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`
}

function cellNeighbours(cellRow: number, cellCol: number, numCellRows: number, numCellCols: number): [number, number][] {
  return ([[cellRow - 1, cellCol], [cellRow + 1, cellCol], [cellRow, cellCol - 1], [cellRow, cellCol + 1]] as [number, number][]).filter(
    ([r, c]) => r >= 0 && r < numCellRows && c >= 0 && c < numCellCols,
  )
}

/**
 * Pure snapshot engine for perfect maze generation via recursive
 * backtracking: an iterative DFS (explicit stack) over the logical cell
 * grid that, at each step, carves through the wall to a random unvisited
 * neighbouring cell and descends into it, backtracking (popping the
 * stack) whenever the current cell has no unvisited neighbours left.
 * Because it never revisits a cell, the carved passages always form a
 * spanning tree over every cell - a "perfect" maze, with exactly one
 * path between any two cells.
 */
export function mazeGenerationEngine(rows: number, cols: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const grid = buildAllWallsGrid(rows, cols)
  const numCellRows = cellRows(rows)
  const numCellCols = cellCols(cols)
  const visited = new Set<string>()

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function state(overrides: Partial<GridAlgorithmState>): GridAlgorithmState {
    return {
      grid,
      rows,
      cols,
      startCell: toGrid(0, 0),
      endCell: toGrid(numCellRows - 1, numCellCols - 1),
      currentCell: null,
      frontierCells: [],
      visitedCount: visited.size,
      algorithmType: 'dfs',
      ...overrides,
    }
  }

  push({ description: `Generating a ${numCellRows}x${numCellCols}-cell maze via recursive backtracking. Every cell starts walled off.`, pseudocodeLine: PSEUDOCODE_LINE.START, state: state({}) })

  const stack: [number, number][] = [[0, 0]]
  visited.add(cellKey(0, 0))
  const [gr0, gc0] = toGrid(0, 0)
  grid[gr0][gc0] = { ...grid[gr0][gc0], state: 'start' }

  push({ description: 'Carved the starting cell.', pseudocodeLine: PSEUDOCODE_LINE.CARVE_START, state: state({ currentCell: [gr0, gc0], visitedCount: visited.size }) })

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1]
    const unvisitedNeighbours = cellNeighbours(cr, cc, numCellRows, numCellCols).filter(([r, c]) => !visited.has(cellKey(r, c)))

    if (unvisitedNeighbours.length > 0) {
      const [nr, nc] = unvisitedNeighbours[Math.floor(Math.random() * unvisitedNeighbours.length)]
      const [gr, gc] = toGrid(cr, cc)
      const [ngr, ngc] = toGrid(nr, nc)
      const wallR = (gr + ngr) / 2
      const wallC = (gc + ngc) / 2
      grid[wallR][wallC] = { ...grid[wallR][wallC], state: 'empty' }
      grid[ngr][ngc] = { ...grid[ngr][ngc], state: 'empty' }
      visited.add(cellKey(nr, nc))
      stack.push([nr, nc])

      push({ description: `Carved through to cell (${nr}, ${nc}).`, pseudocodeLine: PSEUDOCODE_LINE.CARVE, state: state({ currentCell: [ngr, ngc], visitedCount: visited.size }) })
    } else {
      stack.pop()
      if (stack.length > 0) {
        const [pr, pc] = stack[stack.length - 1]
        const [pgr, pgc] = toGrid(pr, pc)
        push({ description: `No unvisited neighbours from (${cr}, ${cc}) - backtracking.`, pseudocodeLine: PSEUDOCODE_LINE.BACKTRACK, state: state({ currentCell: [pgr, pgc], visitedCount: visited.size }) })
      }
    }
  }

  const [endGr, endGc] = toGrid(numCellRows - 1, numCellCols - 1)
  grid[endGr][endGc] = { ...grid[endGr][endGc], state: 'end' }

  push({
    description: `Maze complete. ${visited.size} of ${numCellRows * numCellCols} cells carved - a perfect maze with exactly one path between any two cells.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    state: state({ currentCell: null }),
    isFinalStep: true,
  })

  return snapshots
}

/**
 * Perfect maze generation via a Prim's-algorithm-style adaptation:
 * grows a single tree from one cell, maintaining a frontier of walls
 * adjacent to it, and at each step carves through a *randomly chosen*
 * (not minimum-weight - there's no weight here) frontier wall into a
 * new cell. Tends to produce mazes with more, shorter branches than
 * recursive backtracking's long corridors, since it grows breadth-first
 * across the whole frontier rather than always extending the most
 * recent passage.
 */
export function mazePrimEngine(rows: number, cols: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const grid = buildAllWallsGrid(rows, cols)
  const numCellRows = cellRows(rows)
  const numCellCols = cellCols(cols)
  const inMaze = new Set<string>()

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function state(overrides: Partial<GridAlgorithmState>): GridAlgorithmState {
    return {
      grid,
      rows,
      cols,
      startCell: toGrid(0, 0),
      endCell: toGrid(numCellRows - 1, numCellCols - 1),
      currentCell: null,
      frontierCells: [],
      visitedCount: inMaze.size,
      algorithmType: 'bfs',
      ...overrides,
    }
  }

  push({ description: `Generating a ${numCellRows}x${numCellCols}-cell maze via Prim's algorithm.`, pseudocodeLine: PSEUDOCODE_LINE.START, state: state({}) })

  inMaze.add(cellKey(0, 0))
  const [gr0, gc0] = toGrid(0, 0)
  grid[gr0][gc0] = { ...grid[gr0][gc0], state: 'start' }

  // Frontier entries are [cellRow, cellCol] of cells adjacent to (but
  // not yet in) the maze.
  let frontier: [number, number][] = cellNeighbours(0, 0, numCellRows, numCellCols)

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length)
    const [fr, fc] = frontier[idx]
    frontier.splice(idx, 1)
    if (inMaze.has(cellKey(fr, fc))) continue

    const inMazeNeighbours = cellNeighbours(fr, fc, numCellRows, numCellCols).filter(([r, c]) => inMaze.has(cellKey(r, c)))
    const [cr, cc] = inMazeNeighbours[Math.floor(Math.random() * inMazeNeighbours.length)]

    const [gr, gc] = toGrid(cr, cc)
    const [ngr, ngc] = toGrid(fr, fc)
    grid[(gr + ngr) / 2][(gc + ngc) / 2] = { ...grid[(gr + ngr) / 2][(gc + ngc) / 2], state: 'empty' }
    grid[ngr][ngc] = { ...grid[ngr][ngc], state: 'empty' }
    inMaze.add(cellKey(fr, fc))

    for (const n of cellNeighbours(fr, fc, numCellRows, numCellCols)) {
      if (!inMaze.has(cellKey(n[0], n[1]))) frontier.push(n)
    }

    push({ description: `Carved through to cell (${fr}, ${fc}).`, pseudocodeLine: PSEUDOCODE_LINE.CARVE, state: state({ currentCell: [ngr, ngc], visitedCount: inMaze.size }) })
  }

  const [endGr, endGc] = toGrid(numCellRows - 1, numCellCols - 1)
  grid[endGr][endGc] = { ...grid[endGr][endGc], state: 'end' }

  push({
    description: `Maze complete. ${inMaze.size} of ${numCellRows * numCellCols} cells carved.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    state: state({ currentCell: null }),
    isFinalStep: true,
  })

  return snapshots
}

/**
 * Perfect maze generation via a Kruskal's-algorithm-style adaptation:
 * every wall between two adjacent cells is a candidate edge; shuffled
 * into random order, then walked through, carving any wall whose two
 * cells aren't already connected (Union-Find) and skipping any that
 * are. Tends to produce the most texturally varied mazes of the three,
 * since carving order has no relationship to physical adjacency at all.
 */
export function mazeKruskalEngine(rows: number, cols: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const grid = buildAllWallsGrid(rows, cols)
  const numCellRows = cellRows(rows)
  const numCellCols = cellCols(cols)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  const parent = new Map<string, string>()
  for (let r = 0; r < numCellRows; r++) for (let c = 0; c < numCellCols; c++) parent.set(cellKey(r, c), cellKey(r, c))
  function find(x: string): string {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    return root
  }

  let carvedCount = 1

  function state(overrides: Partial<GridAlgorithmState>): GridAlgorithmState {
    return {
      grid,
      rows,
      cols,
      startCell: toGrid(0, 0),
      endCell: toGrid(numCellRows - 1, numCellCols - 1),
      currentCell: null,
      frontierCells: [],
      visitedCount: carvedCount,
      algorithmType: 'bfs',
      ...overrides,
    }
  }

  push({ description: `Generating a ${numCellRows}x${numCellCols}-cell maze via Kruskal's algorithm.`, pseudocodeLine: PSEUDOCODE_LINE.START, state: state({}) })

  const [gr0, gc0] = toGrid(0, 0)
  grid[gr0][gc0] = { ...grid[gr0][gc0], state: 'start' }
  for (let r = 0; r < numCellRows; r++) {
    for (let c = 0; c < numCellCols; c++) {
      if (!(r === 0 && c === 0)) {
        const [gr, gc] = toGrid(r, c)
        grid[gr][gc] = { ...grid[gr][gc], state: 'empty' }
      }
    }
  }
  carvedCount = numCellRows * numCellCols

  const walls: [number, number, number, number][] = []
  for (let r = 0; r < numCellRows; r++) {
    for (let c = 0; c < numCellCols; c++) {
      if (r + 1 < numCellRows) walls.push([r, c, r + 1, c])
      if (c + 1 < numCellCols) walls.push([r, c, r, c + 1])
    }
  }
  for (let i = walls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[walls[i], walls[j]] = [walls[j], walls[i]]
  }

  for (const [r1, c1, r2, c2] of walls) {
    const root1 = find(cellKey(r1, c1))
    const root2 = find(cellKey(r2, c2))
    if (root1 === root2) continue
    parent.set(root1, root2)

    const [gr1, gc1] = toGrid(r1, c1)
    const [gr2, gc2] = toGrid(r2, c2)
    grid[(gr1 + gr2) / 2][(gc1 + gc2) / 2] = { ...grid[(gr1 + gr2) / 2][(gc1 + gc2) / 2], state: 'empty' }

    push({ description: `Carved the wall between (${r1}, ${c1}) and (${r2}, ${c2}) - they were in different components.`, pseudocodeLine: PSEUDOCODE_LINE.CARVE, state: state({ currentCell: [gr2, gc2] }) })
  }

  const [endGr, endGc] = toGrid(numCellRows - 1, numCellCols - 1)
  grid[endGr][endGc] = { ...grid[endGr][endGc], state: 'end' }

  push({
    description: `Maze complete. ${numCellRows * numCellCols} cells connected by a single spanning tree of passages.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    state: state({ currentCell: null }),
    isFinalStep: true,
  })

  return snapshots
}
