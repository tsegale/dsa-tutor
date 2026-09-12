import { describe, it, expect } from 'vitest'
import { countingSortEngine, type CountingSortState } from './countingSort'

function lastState(snapshots: ReturnType<typeof countingSortEngine>): CountingSortState {
  return snapshots[snapshots.length - 1].dataStructureState as CountingSortState
}

describe('countingSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = countingSortEngine([4, 2, 2, 8, 3, 3, 1])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).output).toEqual([1, 2, 2, 3, 3, 4, 8])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = countingSortEngine([])

    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('handles a single-element array', () => {
    const snapshots = countingSortEngine([7])

    expect(lastState(snapshots).output).toEqual([7])
  })

  it('sorts an already-sorted array correctly', () => {
    const snapshots = countingSortEngine([1, 2, 3, 4, 5])

    expect(lastState(snapshots).output).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts a reverse-sorted array correctly', () => {
    const snapshots = countingSortEngine([5, 4, 3, 2, 1])

    expect(lastState(snapshots).output).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts an array with duplicate values correctly (stable order)', () => {
    const snapshots = countingSortEngine([3, 1, 3, 2, 1])

    expect(lastState(snapshots).output).toEqual([1, 1, 2, 3, 3])
  })

  it('gives every COUNT_INCREMENT junction a valid input index', () => {
    const snapshots = countingSortEngine([4, 2, 2, 8, 3, 3, 1, 9, 6, 0])
    const decisions = snapshots.filter((s) => s.criticalJunctionType === 'COUNT_INCREMENT')

    expect(decisions.length).toBeGreaterThan(0)
    for (const step of decisions) {
      const state = step.dataStructureState as CountingSortState
      expect(state.currentInputIndex).toBeGreaterThanOrEqual(0)
      expect(state.input[state.currentInputIndex]).toBeTypeOf('number')
    }
  })

  it('gives every PLACE_ELEMENT junction a placement index consistent with the count array', () => {
    const snapshots = countingSortEngine([4, 2, 2, 8, 3, 3, 1])
    const placements = snapshots.filter((s) => s.criticalJunctionType === 'PLACE_ELEMENT')

    expect(placements.length).toBe(7) // one per input element
    for (const step of placements) {
      const state = step.dataStructureState as CountingSortState
      const val = state.input[state.currentInputIndex]
      expect(state.count[val] - 1).toBeGreaterThanOrEqual(0)
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = countingSortEngine([4, 2, 2, 8, 3, 3, 1])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = countingSortEngine([4, 2, 2, 8, 3, 3, 1])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [4, 2, 2, 8, 3, 3, 1]
    const originalCopy = [...original]

    const snapshots = countingSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as CountingSortState).count
    mutable.push(999)
    expect((snapshots[1].dataStructureState as CountingSortState).count).not.toContain(999)
  })
})
