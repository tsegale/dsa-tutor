import { describe, it, expect } from 'vitest'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { computeMistakePath } from './mistakePath'

function swapDecisionSnapshot(overrides: Partial<AlgorithmSnapshot> = {}): AlgorithmSnapshot {
  return {
    stepIndex: 5,
    description: 'Comparing index 2 (value 7) and index 3 (value 3). Since 7 > 3, a swap is needed.',
    pseudocodeLine: 2,
    isPredictionRequired: true,
    predictionType: 'CANVAS_CLICK',
    dataStructureState: [1, 4, 7, 3, 9],
    activeIndices: [2, 3],
    highlightIndices: [],
    comparedIndices: [2, 3],
    swappedIndices: [],
    isFinalStep: false,
    criticalJunctionType: 'SWAP_DECISION',
    junctionDifficulty: 'PROCEDURAL',
    ...overrides,
  }
}

describe('computeMistakePath', () => {
  it('returns an empty path for a non-SWAP_DECISION junction', () => {
    const snapshot = swapDecisionSnapshot({ criticalJunctionType: 'PASS_COMPLETE', junctionDifficulty: 'CONCEPTUAL' })
    expect(computeMistakePath(snapshot, 'largest-in-place')).toEqual([])
  })

  it('applies the wrong "no swap" operation when a swap was needed', () => {
    const snapshot = swapDecisionSnapshot() // 7 > 3, a swap is correct
    const path = computeMistakePath(snapshot, 'no-swap')

    expect(path).toHaveLength(2)
    expect(path[0].dataStructureState).toEqual([1, 4, 7, 3, 9]) // left unchanged, still wrong order
    expect(path[0].swappedIndices).toEqual([])
    expect(path[0].isPredictionRequired).toBe(false)
    expect(path[0].criticalJunctionType).toBeNull()
  })

  it('applies the wrong "swap" operation when no swap was needed', () => {
    const snapshot = swapDecisionSnapshot({
      description: 'Comparing index 2 (value 3) and index 3 (value 7). Since 3 <= 7, no swap is needed.',
      dataStructureState: [1, 4, 3, 7, 9],
    })
    const path = computeMistakePath(snapshot, 'swap')

    expect(path[0].dataStructureState).toEqual([1, 4, 7, 3, 9]) // wrongly swapped
    expect(path[0].swappedIndices).toEqual([2, 3])
  })

  it('defaults to the operation opposite the correct one when the answer format is an index', () => {
    // Student clicked index 3 (the smaller value) instead of index 2 (the larger one) -> implies "no swap"
    const snapshot = swapDecisionSnapshot()
    const path = computeMistakePath(snapshot, '3')

    expect(path[0].swappedIndices).toEqual([]) // implied "no swap", the wrong choice here
  })

  it('traces the next comparison the algorithm would make from the mistaken state', () => {
    const snapshot = swapDecisionSnapshot()
    const path = computeMistakePath(snapshot, 'no-swap')

    expect(path[1].activeIndices).toEqual([3, 4])
    expect(path[1].comparedIndices).toEqual([3, 4])
    expect(path[1].stepIndex).toBe(snapshot.stepIndex + 1)
  })

  it('falls back to an end-of-pass description when there is no next comparison', () => {
    const snapshot = swapDecisionSnapshot({
      dataStructureState: [1, 4, 9, 7],
      activeIndices: [2, 3],
      comparedIndices: [2, 3],
    })
    const path = computeMistakePath(snapshot, 'no-swap')

    expect(path[1].activeIndices).toEqual([])
    expect(path[1].description).toContain('pass ends')
  })
})
