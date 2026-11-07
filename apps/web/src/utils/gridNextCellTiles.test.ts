import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, type GridAlgorithmState } from '@dsa-tutor/types'
import { runFor } from '@/engine/runFor'
import { getTilesForSnapshot } from './tileBuilder'

/**
 * Grid Dijkstra and A* ask which frontier cell comes off next: the lowest
 * g(n), and the lowest f(n) = g(n) + h(n). Tiles that print that number
 * turn the question into reading two numbers off the buttons, so they
 * print the parts it is made of instead, and the parts must add up.
 */
function nextCellQuestions(slug: string) {
  return runFor(slug).filter(
    (s) => s.isPredictionRequired && s.criticalJunctionType === CriticalJunctionType.GRID_NEXT_CELL,
  )
}

describe('Grid Dijkstra next-cell tiles', () => {
  const questions = nextCellQuestions('grid-dijkstra')

  it('has questions to check', () => {
    expect(questions.length).toBeGreaterThan(0)
  })

  it('never prints a cell\'s own distance, only where it came from and the step onto it', () => {
    for (const snapshot of questions) {
      const state = snapshot.dataStructureState as GridAlgorithmState
      for (const tile of getTilesForSnapshot(snapshot, 'Grid Dijkstra')) {
        if (!/^\d+,\d+$/.test(tile.id)) continue // conceptual tiles carry no cell
        expect(tile.label).not.toMatch(/g\(n\)/)
        const m = tile.label.match(/^\((\d+), (\d+)\) - from \(\d+, \d+\) at (\d+), entering costs (\d+)$/)
        expect(m, tile.label).not.toBeNull()
        const [, r, c, fromG, step] = m!.map(Number)
        expect(fromG + step).toBe(state.grid[r][c].gScore)
      }
    }
  })
})

describe('Grid A* next-cell tiles', () => {
  const questions = nextCellQuestions('grid-astar')

  it('prints g and h, never their sum, and they add up to f', () => {
    expect(questions.length).toBeGreaterThan(0)
    for (const snapshot of questions) {
      const state = snapshot.dataStructureState as GridAlgorithmState
      for (const tile of getTilesForSnapshot(snapshot, 'Grid A*')) {
        if (!/^\d+,\d+$/.test(tile.id)) continue // conceptual tiles carry no cell
        expect(tile.label).not.toMatch(/f\(n\) =/)
        const m = tile.label.match(/^\((\d+), (\d+)\) - g = (\d+), h = (\d+)$/)
        expect(m, tile.label).not.toBeNull()
        const [, r, c, g, h] = m!.map(Number)
        expect(g + h).toBe(state.grid[r][c].fScore)
      }
    }
  })
})
