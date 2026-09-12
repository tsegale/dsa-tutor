import { describe, it, expect } from 'vitest'
import { radixSortEngine, type RadixSortState } from './radixSort'

function lastState(snapshots: ReturnType<typeof radixSortEngine>): RadixSortState {
  return snapshots[snapshots.length - 1].dataStructureState as RadixSortState
}

describe('radixSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = radixSortEngine([170, 45, 75, 90, 802, 24, 2, 66])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([2, 24, 45, 66, 75, 90, 170, 802])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = radixSortEngine([])

    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([])
  })

  it('handles a single-element array', () => {
    const snapshots = radixSortEngine([42])

    expect(lastState(snapshots).array).toEqual([42])
  })

  it('handles an array of all zeros without throwing', () => {
    const snapshots = radixSortEngine([0, 0, 0])

    expect(lastState(snapshots).array).toEqual([0, 0, 0])
  })

  it('sorts an already-sorted array correctly', () => {
    const snapshots = radixSortEngine([1, 2, 3, 4, 5])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts a reverse-sorted array correctly', () => {
    const snapshots = radixSortEngine([50, 40, 30, 20, 10])

    expect(lastState(snapshots).array).toEqual([10, 20, 30, 40, 50])
  })

  it('sorts an array with duplicate values correctly (stable order)', () => {
    const snapshots = radixSortEngine([30, 10, 30, 20, 10])

    expect(lastState(snapshots).array).toEqual([10, 10, 20, 30, 30])
  })

  it('gives every DIGIT_BUCKET junction a digit consistent with the current pass', () => {
    const snapshots = radixSortEngine([170, 45, 75, 90, 802, 24, 2, 66])
    const decisions = snapshots.filter((s) => s.criticalJunctionType === 'DIGIT_BUCKET')

    expect(decisions.length).toBeGreaterThan(0)
    for (const step of decisions) {
      const state = step.dataStructureState as RadixSortState
      const expectedDigit = Math.floor(state.currentElement / state.digitPosition) % 10
      expect(state.currentDigit).toBe(expectedDigit)
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = radixSortEngine([170, 45, 75, 90, 802, 24, 2, 66])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = radixSortEngine([170, 45, 75, 90, 802, 24, 2, 66])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [170, 45, 75, 90, 802, 24, 2, 66]
    const originalCopy = [...original]

    const snapshots = radixSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as RadixSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as RadixSortState).array).not.toContain(999)
  })
})
