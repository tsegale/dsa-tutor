import { describe, it, expect } from 'vitest'
import { heapSortEngine, type HeapSortState } from './heapSort'

function lastState(snapshots: ReturnType<typeof heapSortEngine>): HeapSortState {
  return snapshots[snapshots.length - 1].dataStructureState as HeapSortState
}

describe('heapSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = heapSortEngine([4, 10, 3, 5, 1, 8, 7, 2])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5, 7, 8, 10])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = heapSortEngine([])

    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([])
  })

  it('handles a single-element array', () => {
    const snapshots = heapSortEngine([42])

    expect(lastState(snapshots).array).toEqual([42])
  })

  it('sorts an already-sorted array correctly', () => {
    const snapshots = heapSortEngine([1, 2, 3, 4, 5])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts a reverse-sorted array correctly', () => {
    const snapshots = heapSortEngine([5, 4, 3, 2, 1])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts an array with duplicate values correctly', () => {
    const snapshots = heapSortEngine([3, 1, 3, 2, 1])

    expect(lastState(snapshots).array).toEqual([1, 1, 2, 3, 3])
  })

  it('gives every HEAP_COMPARE junction a parent/child activeIndices pair that reflects the array', () => {
    const snapshots = heapSortEngine([4, 10, 3, 5, 1, 8, 7, 2])
    const compares = snapshots.filter((s) => s.criticalJunctionType === 'HEAP_COMPARE')

    expect(compares.length).toBeGreaterThan(0)
    for (const step of compares) {
      expect(step.activeIndices.length).toBe(2)
      const state = step.dataStructureState as HeapSortState
      const [parent, child] = step.activeIndices
      expect(state.array[parent]).toBeTypeOf('number')
      expect(state.array[child]).toBeTypeOf('number')
    }
  })

  it('gives every HEAP_EXTRACT junction the root as the only candidate', () => {
    const snapshots = heapSortEngine([4, 10, 3, 5, 1, 8, 7, 2])
    const extracts = snapshots.filter((s) => s.criticalJunctionType === 'HEAP_EXTRACT')

    expect(extracts.length).toBe(7) // n - 1 extractions for n = 8
    for (const step of extracts) {
      expect(step.activeIndices).toEqual([0])
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = heapSortEngine([4, 10, 3, 5, 1, 8, 7, 2])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = heapSortEngine([4, 10, 3, 5, 1, 8, 7, 2])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [4, 10, 3, 5, 1, 8, 7, 2]
    const originalCopy = [...original]

    const snapshots = heapSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as HeapSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as HeapSortState).array).not.toContain(999)
  })
})
