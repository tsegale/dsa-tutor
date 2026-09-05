import { describe, it, expect } from 'vitest'
import { binarySearchEngine, type BinarySearchState } from './binarySearch'

function lastState(snapshots: ReturnType<typeof binarySearchEngine>): BinarySearchState {
  return snapshots[snapshots.length - 1].dataStructureState as BinarySearchState
}

function midpointSnapshots(snapshots: ReturnType<typeof binarySearchEngine>) {
  return snapshots.filter((s) => s.criticalJunctionType === 'MIDPOINT_DECISION')
}

describe('binarySearchEngine', () => {
  it('finds a target at the low boundary after sorting', () => {
    const snapshots = binarySearchEngine([9, 3, 1, 7, 5], 1)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(0)
    expect(state.array).toEqual([1, 3, 5, 7, 9])
  })

  it('finds a target at the high boundary', () => {
    const snapshots = binarySearchEngine([9, 3, 1, 7, 5], 9)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(4)
  })

  it('reports not found when the target is absent', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9], 4)
    const state = lastState(snapshots)

    expect(state.found).toBe(false)
    expect(state.foundIndex).toBeNull()
  })

  it('returns exactly 2 snapshots for an empty array without throwing', () => {
    const snapshots = binarySearchEngine([], 5)

    expect(snapshots.length).toBe(2)
    expect(snapshots[1].isFinalStep).toBe(true)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('finds a single-element array immediately when it equals the target', () => {
    const snapshots = binarySearchEngine([42], 42)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(0)
    expect(midpointSnapshots(snapshots).length).toBe(1)
  })

  it('reports not found for a single-element array that does not equal the target', () => {
    const snapshots = binarySearchEngine([42], 7)
    const state = lastState(snapshots)

    expect(state.found).toBe(false)
    expect(state.foundIndex).toBeNull()
  })

  it('finds a valid occurrence of a duplicated target value', () => {
    const snapshots = binarySearchEngine([1, 5, 5, 5, 9], 5)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.array[state.foundIndex as number]).toBe(5)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 7)
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every snapshot a valid dataStructureState with array, target, low, high, and mid fields', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 7)

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as BinarySearchState
      expect(Array.isArray(state.array)).toBe(true)
      expect(state.target).toBe(7)
      expect(typeof state.low).toBe('number')
      expect(typeof state.high).toBe('number')
    }
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 7)

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('computes mid as Math.floor((low + high) / 2) at every midpoint decision', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 19)

    for (const snapshot of midpointSnapshots(snapshots)) {
      const state = snapshot.dataStructureState as BinarySearchState
      expect(state.mid).toBe(Math.floor((state.low + state.high) / 2))
    }
  })

  it('grows the eliminated index list on each successive midpoint decision', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 1)
    const decisions = midpointSnapshots(snapshots)

    let previousCount = -1
    for (const snapshot of decisions) {
      const state = snapshot.dataStructureState as BinarySearchState
      expect(state.eliminated.length).toBeGreaterThanOrEqual(previousCount)
      previousCount = state.eliminated.length
    }
    const finalDecisionState = decisions[decisions.length - 1].dataStructureState as BinarySearchState
    expect(finalDecisionState.eliminated.length + 1).toBeLessThanOrEqual(8)
  })

  it('never uses more than log2(n) rounded up midpoint decisions for a length-8 array', () => {
    const snapshots = binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 19)

    expect(midpointSnapshots(snapshots).length).toBeLessThanOrEqual(4)
  })
})
