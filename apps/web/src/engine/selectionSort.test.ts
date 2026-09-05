import { describe, it, expect } from 'vitest'
import { selectionSortEngine, type SelectionSortState } from './selectionSort'

function lastState(snapshots: ReturnType<typeof selectionSortEngine>): SelectionSortState {
  return snapshots[snapshots.length - 1].dataStructureState as SelectionSortState
}

describe('selectionSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = selectionSortEngine([5, 3, 8, 1, 9, 2])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 5, 8, 9])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('returns exactly 3 snapshots for an empty array without throwing', () => {
    const snapshots = selectionSortEngine([])

    expect(snapshots.length).toBe(3)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('returns exactly 3 snapshots for a single-element array', () => {
    const snapshots = selectionSortEngine([42])

    expect(snapshots.length).toBe(3)
    expect(lastState(snapshots).array).toEqual([42])
  })

  it('sorts equal elements correctly, identifying the true minimum among ties', () => {
    const snapshots = selectionSortEngine([3, 3, 1])

    expect(lastState(snapshots).array).toEqual([1, 3, 3])
  })

  it('terminates with fewer NEW_MINIMUM junctions on an already sorted array than a reverse sorted one', () => {
    const sorted = selectionSortEngine([1, 2, 3, 4, 5])
    const reversed = selectionSortEngine([5, 4, 3, 2, 1])

    const countNewMin = (snapshots: ReturnType<typeof selectionSortEngine>) =>
      snapshots.filter((s) => s.criticalJunctionType === 'NEW_MINIMUM').length

    expect(countNewMin(sorted)).toBeLessThan(countNewMin(reversed))
  })

  it('performs exactly n-1 swaps for a fully unsorted array', () => {
    const snapshots = selectionSortEngine([5, 4, 3, 2, 1])
    const swaps = snapshots.filter((s) => s.swappedIndices.length > 0)

    expect(swaps.length).toBe(4) // n-1 for n=5
  })

  it('increments sortedUpTo exactly once per pass', () => {
    const snapshots = selectionSortEngine([5, 3, 8, 1, 9, 2])
    const passCompleteSteps = snapshots.filter((s) => s.criticalJunctionType === 'PASS_COMPLETE')
    const sortedUpToValues = passCompleteSteps.map((s) => (s.dataStructureState as SelectionSortState).sortedUpTo)

    expect(sortedUpToValues).toEqual([1, 2, 3, 4, 5])
  })

  it('only marks NEW_MINIMUM when a smaller element is actually found, never on a larger scan value', () => {
    const snapshots = selectionSortEngine([1, 5, 4, 3, 2])
    const newMinSteps = snapshots.filter((s) => s.criticalJunctionType === 'NEW_MINIMUM')

    for (const step of newMinSteps) {
      const state = step.dataStructureState as SelectionSortState
      expect(state.array[state.scanIndex]).toBeLessThan(state.array[state.currentMin])
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = selectionSortEngine([5, 3, 8, 1, 9, 2])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every snapshot a valid dataStructureState with array, sortedUpTo, currentMin, and scanIndex', () => {
    const snapshots = selectionSortEngine([5, 3, 8, 1, 9, 2])

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as SelectionSortState
      expect(Array.isArray(state.array)).toBe(true)
      expect(typeof state.sortedUpTo).toBe('number')
      expect(typeof state.currentMin).toBe('number')
      expect(typeof state.scanIndex).toBe('number')
    }
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = selectionSortEngine([5, 3, 8, 1, 9, 2])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [5, 3, 8, 1, 9, 2]
    const originalCopy = [...original]

    const snapshots = selectionSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as SelectionSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as SelectionSortState).array).not.toContain(999)
  })
})
