import { describe, it, expect } from 'vitest'
import { quickSortEngine, type QuickSortState } from './quickSort'

function lastState(snapshots: ReturnType<typeof quickSortEngine>): QuickSortState {
  return snapshots[snapshots.length - 1].dataStructureState as QuickSortState
}

function countPartitionDecisions(snapshots: ReturnType<typeof quickSortEngine>): number {
  return snapshots.filter((s) => s.criticalJunctionType === 'PARTITION_DECISION').length
}

describe('quickSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = quickSortEngine([7, 2, 9, 1, 5, 8, 3])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 5, 7, 8, 9])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  // Lomuto partitioning with a last-element pivot is the classic worst
  // case for already-sorted or reverse-sorted input: each partition only
  // peels off one element instead of roughly halving the range, so it
  // needs far more partition operations (and comparisons) than a input
  // whose pivots land closer to the median each time.
  it('needs more partition comparisons on already-sorted (worst-case) input than on a balanced input of the same length', () => {
    const sorted = quickSortEngine([1, 2, 3, 4, 5, 6, 7])
    const balanced = quickSortEngine([4, 2, 6, 1, 3, 5, 7])

    expect(countPartitionDecisions(sorted)).toBeGreaterThanOrEqual(countPartitionDecisions(balanced))
    expect(lastState(sorted).array).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('sorts a reverse sorted array correctly (also a worst case for last-element pivot)', () => {
    const snapshots = quickSortEngine([7, 6, 5, 4, 3, 2, 1])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('returns exactly 2 snapshots for an empty array without throwing', () => {
    const snapshots = quickSortEngine([])

    expect(snapshots.length).toBe(2)
    expect(snapshots[1].isFinalStep).toBe(true)
  })

  it('returns exactly 2 snapshots for a single-element array', () => {
    const snapshots = quickSortEngine([42])

    expect(snapshots.length).toBe(2)
    expect(lastState(snapshots).array).toEqual([42])
    expect(lastState(snapshots).sortedIndices).toEqual([0])
  })

  it('sorts a two-element array correctly', () => {
    const snapshots = quickSortEngine([2, 1])

    expect(lastState(snapshots).array).toEqual([1, 2])
  })

  it('sorts an array with duplicate values correctly', () => {
    const snapshots = quickSortEngine([3, 1, 3, 2])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 3])
  })

  it('places each pivot in its correct final sorted position at the moment it is placed', () => {
    const snapshots = quickSortEngine([7, 2, 9, 1, 5, 8, 3])
    const sorted = [1, 2, 3, 5, 7, 8, 9]

    // Every PIVOT_SELECTION's pivot must eventually settle at an index
    // whose sorted-array value matches the pivot's own value.
    const pivotSelections = snapshots.filter((s) => s.criticalJunctionType === 'PIVOT_SELECTION')
    expect(pivotSelections.length).toBeGreaterThan(0)

    for (const step of pivotSelections) {
      const state = step.dataStructureState as QuickSortState
      expect(sorted).toContain(state.pivotValue)
    }
  })

  it('grows sortedIndices monotonically - indices already marked sorted are never removed', () => {
    const snapshots = quickSortEngine([7, 2, 9, 1, 5, 8, 3])

    let previous: number[] = []
    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as QuickSortState
      for (const idx of previous) {
        expect(state.sortedIndices).toContain(idx)
      }
      previous = state.sortedIndices
    }
    expect(previous.length).toBe(7)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = quickSortEngine([7, 2, 9, 1, 5, 8, 3])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [7, 2, 9, 1, 5, 8, 3]
    const originalCopy = [...original]

    const snapshots = quickSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as QuickSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as QuickSortState).array).not.toContain(999)
  })
})
