import { describe, it, expect } from 'vitest'
import type { GridAlgorithmState, GridCell } from '@dsa-tutor/types'
import { gridBfsEngine, gridDfsEngine, gridDijkstraEngine, gridAStarEngine, buildEmptyGrid } from './gridAlgorithms'

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
