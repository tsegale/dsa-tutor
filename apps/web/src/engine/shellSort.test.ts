import { describe, it, expect } from 'vitest'
import { shellSortEngine, type ShellSortState } from './shellSort'

function lastState(snapshots: ReturnType<typeof shellSortEngine>): ShellSortState {
  return snapshots[snapshots.length - 1].dataStructureState as ShellSortState
}

describe('shellSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = shellSortEngine([8, 3, 7, 1, 5, 9, 2, 6])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 5, 6, 7, 8, 9])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = shellSortEngine([])

    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([])
  })

  it('handles a single-element array', () => {
    const snapshots = shellSortEngine([42])

    expect(lastState(snapshots).array).toEqual([42])
  })

  it('sorts an already-sorted array correctly', () => {
    const snapshots = shellSortEngine([1, 2, 3, 4, 5])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts a reverse-sorted array correctly', () => {
    const snapshots = shellSortEngine([5, 4, 3, 2, 1])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts an array with duplicate values correctly', () => {
    const snapshots = shellSortEngine([3, 1, 3, 2, 1])

    expect(lastState(snapshots).array).toEqual([1, 1, 2, 3, 3])
  })

  it('gives every GAP_COMPARISON junction a valid keyIndex/compareIndex pair', () => {
    const snapshots = shellSortEngine([8, 3, 7, 1, 5, 9, 2, 6])
    const decisions = snapshots.filter((s) => s.criticalJunctionType === 'GAP_COMPARISON')

    expect(decisions.length).toBeGreaterThan(0)
    for (const step of decisions) {
      const state = step.dataStructureState as ShellSortState
      expect(state.keyIndex).toBeGreaterThanOrEqual(0)
      expect(state.compareIndex).toBeGreaterThanOrEqual(0)
      expect(state.gap).toBeGreaterThan(0)
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = shellSortEngine([8, 3, 7, 1, 5, 9, 2, 6])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = shellSortEngine([8, 3, 7, 1, 5, 9, 2, 6])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [8, 3, 7, 1, 5, 9, 2, 6]
    const originalCopy = [...original]

    const snapshots = shellSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as ShellSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as ShellSortState).array).not.toContain(999)
  })
})
