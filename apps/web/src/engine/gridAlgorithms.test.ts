import { describe, it, expect } from 'vitest'
import type { GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import {
  gridBfsEngine,
  gridDfsEngine,
  gridDijkstraEngine,
  gridAStarEngine,
  buildEmptyGrid,
  buildWalledGrid,
  buildTerrainGrid,
  PATHFINDER_BOARD,
} from './gridAlgorithms'
import { runFor } from './runFor'
import { getAlgorithmRegistryEntry } from './registry'

function lastState(snapshots: ReturnType<typeof gridBfsEngine>): GridAlgorithmState {
  return snapshots[snapshots.length - 1].dataStructureState as GridAlgorithmState
}

/** Plain reference BFS (different implementation style from the shared
 * runGridSearch core under test) used purely as an independent
 * cross-check on shortest path length. */
function referenceShortestPathLength(grid: GridCell[][], startRow: number, startCol: number, endRow: number, endCol: number): number | null {
  const rows = grid.length
  const cols = grid[0].length
  const dist = new Map<string, number>()
  const key = (r: number, c: number) => `${r},${c}`
  dist.set(key(startRow, startCol), 0)
  const queue: [number, number][] = [[startRow, startCol]]
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    if (r === endRow && c === endCol) return dist.get(key(r, c))!
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc].state === 'wall') continue
      const k = key(nr, nc)
      if (dist.has(k)) continue
      dist.set(k, dist.get(key(r, c))! + 1)
      queue.push([nr, nc])
    }
  }
  return null
}

describe('gridBfsEngine', () => {
  it('finds the shortest path on an open grid', () => {
    const grid = buildEmptyGrid(10, 10)
    const snapshots = gridBfsEngine(grid, 0, 0, 9, 9)
    const state = lastState(snapshots)
    expect(state.pathLength).toBe(referenceShortestPathLength(grid, 0, 0, 9, 9))
    expect(state.pathLength).toBe(18) // Manhattan distance on an open grid
  })

  it('routes around a wall', () => {
    const grid = buildEmptyGrid(5, 5)
    // Wall off column 2 except row 4, forcing a detour.
    for (let r = 0; r < 4; r++) grid[r][2] = { ...grid[r][2], state: 'wall' }
    const snapshots = gridBfsEngine(grid, 0, 0, 0, 4)
    const state = lastState(snapshots)
    expect(state.pathLength).toBe(referenceShortestPathLength(grid, 0, 0, 0, 4))
  })

  it('reports no path when the end cell is fully walled off', () => {
    const grid = buildEmptyGrid(5, 5)
    for (let c = 0; c < 5; c++) grid[2][c] = { ...grid[2][c], state: 'wall' }
    const snapshots = gridBfsEngine(grid, 0, 0, 4, 4)
    const state = lastState(snapshots)
    expect(state.pathLength).toBeUndefined()
    expect(referenceShortestPathLength(grid, 0, 0, 4, 4)).toBeNull()
  })

  it('has sequential stepIndex values with no gaps', () => {
    const grid = buildEmptyGrid(6, 6)
    const snapshots = gridBfsEngine(grid, 0, 0, 5, 5)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('gridDfsEngine', () => {
  it('finds a valid path, not necessarily the shortest', () => {
    const grid = buildEmptyGrid(6, 6)
    const snapshots = gridDfsEngine(grid, 0, 0, 5, 5)
    const state = lastState(snapshots)
    expect(state.pathLength).toBeGreaterThanOrEqual(referenceShortestPathLength(grid, 0, 0, 5, 5)!)
  })
})

describe('gridDijkstraEngine', () => {
  it('matches BFS shortest path length on a uniform-cost grid', () => {
    const grid = buildEmptyGrid(8, 8)
    for (let r = 0; r < 6; r++) grid[r][3] = { ...grid[r][3], state: 'wall' }
    const bfsLength = lastState(gridBfsEngine(grid, 0, 0, 7, 7)).pathLength
    const dijkstraLength = lastState(gridDijkstraEngine(grid, 0, 0, 7, 7)).pathLength
    expect(dijkstraLength).toBe(bfsLength)
  })
})

describe('gridAStarEngine', () => {
  it('finds a path of the same (optimal) length as BFS, exploring no more cells', () => {
    const grid = buildEmptyGrid(12, 12)
    for (let r = 0; r < 9; r++) grid[r][6] = { ...grid[r][6], state: 'wall' }
    const bfsState = lastState(gridBfsEngine(grid, 0, 0, 11, 11))
    const astarState = lastState(gridAStarEngine(grid, 0, 0, 11, 11))
    expect(astarState.pathLength).toBe(bfsState.pathLength)
    expect(astarState.visitedCount).toBeLessThanOrEqual(bfsState.visitedCount)
  })

  it('explores strictly fewer cells than BFS on a large open grid (the whole point of the heuristic)', () => {
    const grid = buildEmptyGrid(20, 35)
    const bfsState = lastState(gridBfsEngine(grid, 10, 2, 10, 32))
    const astarState = lastState(gridAStarEngine(grid, 10, 2, 10, 32))
    expect(astarState.pathLength).toBe(bfsState.pathLength)
    expect(astarState.visitedCount).toBeLessThan(bfsState.visitedCount)
  })
})

describe('the board the pathfinders open on', () => {
  const SLUGS = ['grid-bfs', 'grid-dfs', 'grid-dijkstra', 'grid-astar'] as const

  it('is walled, and reachable', () => {
    const grid = buildWalledGrid(PATHFINDER_BOARD.rows, PATHFINDER_BOARD.cols)
    const walls = grid.flat().filter((cell) => cell.state === 'wall').length
    expect(walls).toBeGreaterThan(0)
    const [sr, sc] = PATHFINDER_BOARD.start
    const [er, ec] = PATHFINDER_BOARD.end
    expect(grid[sr][sc].state).toBe('empty')
    expect(grid[er][ec].state).toBe('empty')
    // A board whose target cannot be reached would make every one of these
    // topics a silent dead end.
    expect(lastState(gridBfsEngine(grid, sr, sc, er, ec)).pathLength).toBeGreaterThan(0)
  })

  it.each(SLUGS)('%s asks a sane number of questions', (slug) => {
    // The whole reason the board gained walls. An empty board is the
    // degenerate case for these four in opposite directions at once: it
    // was 139 junctions for BFS and 7 for A* at 20x35, and shrinking it
    // alone took A* down to 2. Both ends have to stay in the band the
    // rest of the curriculum sits in (3-35).
    const run = runFor(slug)
    const junctions = run.filter((snapshot) => snapshot.isPredictionRequired).length
    expect(junctions, `${slug} junctions`).toBeGreaterThanOrEqual(5)
    expect(junctions, `${slug} junctions`).toBeLessThanOrEqual(40)
    expect(run.length, `${slug} steps`).toBeLessThanOrEqual(200)
  })

  it('builds the same run from the registry as from runFor', () => {
    // Two call sites built this board from their own copy of 20x35, so a
    // change to one would have left the other behind.
    for (const slug of SLUGS) {
      const entry = getAlgorithmRegistryEntry(slug)!
      expect(entry.engineFunction([]).length, slug).toBe(runFor(slug).length)
    }
  })
})

describe('weighted terrain', () => {
  const B = PATHFINDER_BOARD
  const run = (engine: typeof gridBfsEngine, grid: GridCell[][]) =>
    engine(grid, B.start[0], B.start[1], B.end[0], B.end[1])

  it('makes Dijkstra disagree with BFS, which is the whole reason it exists', () => {
    // On a uniform board these two produced identical runs down to the
    // step, because "nearest unvisited" and "longest waiting" are the same
    // cell when every move costs 1. Dijkstra's subject had nowhere to
    // happen.
    const bfs = lastState(run(gridBfsEngine, buildTerrainGrid(B.rows, B.cols)))
    const dijkstra = lastState(run(gridDijkstraEngine, buildTerrainGrid(B.rows, B.cols)))

    expect(dijkstra.pathCost!).toBeLessThan(bfs.pathCost!)
    expect(dijkstra.pathLength!).toBeGreaterThan(bfs.pathLength!)
  })

  it('still agrees with BFS when the board is uniform', () => {
    // The weights are board data, not engine behaviour: a board that sets
    // none has to run exactly as it did before any of this.
    const bfs = run(gridBfsEngine, buildWalledGrid(B.rows, B.cols))
    const dijkstra = run(gridDijkstraEngine, buildWalledGrid(B.rows, B.cols))
    expect(dijkstra.length).toBe(bfs.length)
    expect(lastState(dijkstra).pathLength).toBe(lastState(bfs).pathLength)
    expect(lastState(bfs).pathCost).toBeUndefined()
    expect(lastState(bfs).weighted).toBeUndefined()
  })

  it('has A* reach the same cost as Dijkstra while looking at no more of the board', () => {
    const dijkstra = lastState(run(gridDijkstraEngine, buildTerrainGrid(B.rows, B.cols)))
    const astar = lastState(run(gridAStarEngine, buildTerrainGrid(B.rows, B.cols)))
    expect(astar.pathCost).toBe(dijkstra.pathCost)
    expect(astar.visitedCount).toBeLessThanOrEqual(dijkstra.visitedCount)
  })

  it('offers two routes, so the cheaper one can be the longer one', () => {
    // A single corridor would leave weights changing the arithmetic and
    // nothing else - same path, bigger numbers.
    const grid = buildTerrainGrid(B.rows, B.cols)
    const rough = grid.flat().filter((cell) => (cell.weight ?? 1) > 1)
    expect(rough.length).toBeGreaterThan(0)
    expect(rough.every((cell) => cell.state !== 'wall')).toBe(true)
    // The start and end are standable, not rough.
    expect(grid[B.start[0]][B.start[1]].weight).toBeUndefined()
    expect(grid[B.end[0]][B.end[1]].weight).toBeUndefined()
  })
})
