import { describe, it, expect } from 'vitest'
import { linearSearchEngine, type LinearSearchState } from './linearSearch'

function lastState(snapshots: ReturnType<typeof linearSearchEngine>): LinearSearchState {
  return snapshots[snapshots.length - 1].dataStructureState as LinearSearchState
}

describe('linearSearchEngine', () => {
  it('finds the target at index 0', () => {
    const snapshots = linearSearchEngine([9, 3, 7, 1], 9)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(0)
  })

  it('checks every element before finding the target at the last index', () => {
    const snapshots = linearSearchEngine([3, 7, 1, 9], 9)
    const checkedIndices = snapshots
      .filter((s) => s.activeIndices.length === 1)
      .map((s) => s.activeIndices[0])

    expect(checkedIndices).toEqual([0, 1, 2, 3])
    expect(lastState(snapshots).found).toBe(true)
    expect(lastState(snapshots).foundIndex).toBe(3)
  })

  it('reports not found when the target is absent', () => {
    const snapshots = linearSearchEngine([3, 7, 1, 4], 99)
    const state = lastState(snapshots)

    expect(state.found).toBe(false)
    expect(state.foundIndex).toBeNull()
  })

  it('returns exactly 2 snapshots for an empty array without throwing', () => {
    const snapshots = linearSearchEngine([], 5)

    expect(snapshots.length).toBe(2)
    expect(snapshots[1].isFinalStep).toBe(true)
    expect(lastState(snapshots).found).toBe(false)
    expect(lastState(snapshots).foundIndex).toBeNull()
  })

  it('finds a single-element array immediately when it equals the target', () => {
    const snapshots = linearSearchEngine([42], 42)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(0)
  })

  it('reports not found for a single-element array that does not equal the target', () => {
    const snapshots = linearSearchEngine([42], 7)
    const state = lastState(snapshots)

    expect(state.found).toBe(false)
    expect(state.foundIndex).toBeNull()
  })

  it('finds the first occurrence of a duplicated value, not the last', () => {
    const snapshots = linearSearchEngine([3, 5, 5, 5, 1], 5)
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundIndex).toBe(1)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = linearSearchEngine([3, 7, 1, 9, 4, 6], 4)
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every snapshot a valid dataStructureState with array, target, and currentIndex', () => {
    const snapshots = linearSearchEngine([3, 7, 1, 9, 4, 6], 4)

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as LinearSearchState
      expect(Array.isArray(state.array)).toBe(true)
      expect(state.target).toBe(4)
      expect(typeof state.currentIndex).toBe('number')
    }
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = linearSearchEngine([3, 7, 1, 9, 4, 6], 4)

    snapshots.forEach((snapshot, i) => {
      if (i === snapshots.length - 1) {
        expect(snapshot.isFinalStep).toBe(true)
      } else {
        expect(snapshot.isFinalStep).toBe(false)
      }
    })
  })
})
