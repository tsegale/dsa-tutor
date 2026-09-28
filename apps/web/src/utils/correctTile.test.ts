import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { correctTileIdFor } from './correctTile'

function snap(junction: CriticalJunctionType, dataStructureState: unknown, activeIndices: number[] = []): AlgorithmSnapshot {
  return { criticalJunctionType: junction, dataStructureState, activeIndices } as unknown as AlgorithmSnapshot
}

describe('correctTileIdFor', () => {
  it('bubble swap: swap only when the left value is larger', () => {
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, [5, 3], [0, 1]))).toBe('swap')
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, [3, 3], [0, 1]))).toBe('no-swap')
  })

  it('insertion swap: shift only while the key is smaller', () => {
    const state = { array: [4, 7, 2], compareIndex: 1, currentKey: 2 }
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, state))).toBe('shift')
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, { ...state, currentKey: 9 }))).toBe('stop')
  })

  it('binary search midpoint: found, left or right', () => {
    const s = { array: [2, 4, 6], mid: 1 }
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 4 }))).toBe('found')
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 2 }))).toBe('search-left')
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 6 }))).toBe('search-right')
  })

  it('BST: equal goes right, empty slots attach by the same rule, deletes use the removal tiles', () => {
    const at = (value: number, target: number) => snap(CriticalJunctionType.BST_DIRECTION, { currentNode: { value }, targetValue: target })
    expect(correctTileIdFor(at(8, 4))).toBe('go-left')
    expect(correctTileIdFor(at(8, 8))).toBe('go-right')
    const slot = (parent: number | null, target: number) =>
      snap(CriticalJunctionType.BST_DIRECTION, { currentNode: null, targetValue: target, insertionParentValue: parent })
    expect(correctTileIdFor(slot(null, 5))).toBe('becomes-root')
    expect(correctTileIdFor(slot(8, 8))).toBe('attach-right')
    expect(correctTileIdFor(snap(CriticalJunctionType.BST_DIRECTION, { currentNode: { value: 4 }, targetValue: 4, deleteCase: 'leaf' }))).toBe('correct')
  })

  it("conceptual junctions are always 'correct'; unknown state-dependent ones are null", () => {
    expect(correctTileIdFor(snap(CriticalJunctionType.PASS_COMPLETE, [1, 2]))).toBe('correct')
    expect(correctTileIdFor(snap(CriticalJunctionType.COMPLEXITY_PREDICTION, [1, 2]))).toBe('correct')
    expect(correctTileIdFor(snap(CriticalJunctionType.TARGET_CHECK, {}))).toBeNull()
  })
})
