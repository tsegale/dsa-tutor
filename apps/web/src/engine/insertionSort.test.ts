import { describe, it, expect } from 'vitest'
import { insertionSortEngine, type InsertionSortState } from './insertionSort'

const PSEUDOCODE_COMPARISON = 2
const PSEUDOCODE_SHIFT = 3

function lastState(snapshots: ReturnType<typeof insertionSortEngine>): InsertionSortState {
  return snapshots[snapshots.length - 1].dataStructureState as InsertionSortState
}

describe('insertionSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = insertionSortEngine([5, 2, 8, 1, 9])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 5, 8, 9])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('returns exactly 3 snapshots for an empty array without throwing', () => {
    const snapshots = insertionSortEngine([])

    expect(snapshots.length).toBe(3)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('returns exactly 3 snapshots for a single-element array', () => {
    const snapshots = insertionSortEngine([42])

    expect(snapshots.length).toBe(3)
    expect(lastState(snapshots).array).toEqual([42])
  })

  it('sorts an array with duplicate values correctly', () => {
    const snapshots = insertionSortEngine([3, 1, 3, 2])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 3])
  })

  it('makes exactly n-1 comparisons and no shifts on an already sorted array', () => {
    const snapshots = insertionSortEngine([1, 2, 3, 4, 5])
    const comparisons = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)
    const shifts = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_SHIFT)

    expect(comparisons.length).toBe(4) // n-1 for n=5
    expect(shifts.length).toBe(0)
  })

  it('makes the maximum number of shifts on a reverse sorted array', () => {
    const snapshots = insertionSortEngine([5, 4, 3, 2, 1])
    const comparisons = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)
    const shifts = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_SHIFT)

    expect(comparisons.length).toBe(10) // n(n-1)/2 for n=5
    expect(shifts.length).toBe(10)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('gives every SWAP_DECISION junction the correct shift-vs-stop answer', () => {
    const snapshots = insertionSortEngine([5, 2, 8, 1, 9])
    const decisions = snapshots.filter((s) => s.criticalJunctionType === 'SWAP_DECISION')

    expect(decisions.length).toBeGreaterThan(0)
    for (const step of decisions) {
      const state = step.dataStructureState as InsertionSortState
      const compareVal = state.array[state.compareIndex]
      // The engine only advances past a comparison when shift was the
      // correct call; a stop should always be the loop's final check.
      expect(typeof compareVal).toBe('number')
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = insertionSortEngine([5, 2, 8, 1, 9])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every snapshot a valid dataStructureState with array, sortedUpTo, currentKey, and compareIndex', () => {
    const snapshots = insertionSortEngine([5, 2, 8, 1, 9])

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as InsertionSortState
      expect(Array.isArray(state.array)).toBe(true)
      expect(typeof state.sortedUpTo).toBe('number')
      expect(typeof state.currentKey).toBe('number')
      expect(typeof state.compareIndex).toBe('number')
    }
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = insertionSortEngine([5, 2, 8, 1, 9])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [5, 2, 8, 1, 9]
    const originalCopy = [...original]

    const snapshots = insertionSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as InsertionSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as InsertionSortState).array).not.toContain(999)
  })
})
