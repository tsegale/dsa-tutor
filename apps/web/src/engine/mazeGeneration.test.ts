import { describe, it, expect } from 'vitest'
import type { GridAlgorithmState } from '@dsa-tutor/types'
import { mazeGenerationEngine, mazePrimEngine, mazeKruskalEngine } from './mazeGeneration'

function lastState(snapshots: ReturnType<typeof mazeGenerationEngine>): GridAlgorithmState {
  return snapshots[snapshots.length - 1].dataStructureState as GridAlgorithmState
}

/** A "perfect maze" has exactly one path between any two cells - i.e.
 * the carved passages form a spanning tree over the logical cell grid.
 * Checked by BFS-ing the actual carved grid (treating any non-wall cell
 * as passable) from (0,0) and confirming every logical cell is reached
 * exactly once, with no way to reach a cell through two different
 * routes (which would require more open cells than a tree allows). */
function assertPerfectMaze(state: GridAlgorithmState) {
  const numCellRows = Math.ceil(state.rows / 2)
  const numCellCols = Math.ceil(state.cols / 2)
  const grid = state.grid

  // Every logical cell (even row, even col) must be open.
  for (let r = 0; r < numCellRows; r++) {
    for (let c = 0; c < numCellCols; c++) {
      expect(grid[r * 2][c * 2].state).not.toBe('wall')
    }
  }

  // BFS over the full pixel grid from the start cell must reach every
  // logical cell, and the number of pixel-grid cells reached must equal
  // exactly (number of logical cells) + (number of carved walls) - for
  // a spanning tree that's (numCells) + (numCells - 1) = 2*numCells - 1.
  const rows = state.rows
  const cols = state.cols
  const visited = new Set<string>()
  const queue: [number, number][] = [[0, 0]]
  visited.add('0,0')
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc].state === 'wall') continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push([nr, nc])
    }
  }

  const numCells = numCellRows * numCellCols
  expect(visited.size).toBe(2 * numCells - 1)

  // Every logical cell must be among the reached pixel-grid positions.
  for (let r = 0; r < numCellRows; r++) {
    for (let c = 0; c < numCellCols; c++) {
      expect(visited.has(`${r * 2},${c * 2}`)).toBe(true)
    }
  }
}

describe('mazeGenerationEngine (recursive backtracking)', () => {
  it('produces a perfect maze (spanning tree, every cell reachable exactly one way)', () => {
    const snapshots = mazeGenerationEngine(11, 15)
    assertPerfectMaze(lastState(snapshots))
  })

  it('produces a perfect maze on an odd/even mixed size', () => {
    const snapshots = mazeGenerationEngine(20, 35)
    assertPerfectMaze(lastState(snapshots))
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = mazeGenerationEngine(9, 9)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('never emits a prediction step', () => {
    const snapshots = mazeGenerationEngine(9, 9)
    expect(snapshots.every((s) => !s.isPredictionRequired)).toBe(true)
  })
})

describe('mazePrimEngine', () => {
  it('produces a perfect maze', () => {
    const snapshots = mazePrimEngine(11, 15)
    assertPerfectMaze(lastState(snapshots))
  })
})

describe('mazeKruskalEngine', () => {
  it('produces a perfect maze', () => {
    const snapshots = mazeKruskalEngine(11, 15)
    assertPerfectMaze(lastState(snapshots))
  })
})
