import { describe, it, expect } from 'vitest'
import { arrayAccessEngine, arrayInsertEngine, arrayDeleteEngine, type ArrayOperationState } from './arrayOperations'

function lastState(snapshots: AlgorithmSnapshots): ArrayOperationState {
  return snapshots[snapshots.length - 1].dataStructureState as ArrayOperationState
}

type AlgorithmSnapshots = ReturnType<typeof arrayAccessEngine>

describe('arrayAccessEngine', () => {
  it('accesses a middle index in the normal case', () => {
    const snapshots = arrayAccessEngine([10, 20, 30, 40, 50], 2)
    const state = lastState(snapshots)

    expect(state.array).toEqual([10, 20, 30, 40, 50])
    expect(state.resultIndex).toBe(2)
    expect(state.array[state.resultIndex!]).toBe(30)
  })

  it('accesses the first index (0)', () => {
    const snapshots = arrayAccessEngine([10, 20, 30], 0)
    const state = lastState(snapshots)

    expect(state.resultIndex).toBe(0)
    expect(state.array[0]).toBe(10)
  })

  it('accesses the last index', () => {
    const snapshots = arrayAccessEngine([10, 20, 30], 2)
    const state = lastState(snapshots)

    expect(state.resultIndex).toBe(2)
    expect(state.array[2]).toBe(30)
  })

  it('accesses the single element of a one-element array', () => {
    const snapshots = arrayAccessEngine([99], 0)
    const state = lastState(snapshots)

    expect(state.resultIndex).toBe(0)
    expect(state.array[0]).toBe(99)
  })

  it('reports an empty array as out of bounds without throwing', () => {
    const snapshots = arrayAccessEngine([], 0)
    const state = lastState(snapshots)

    expect(snapshots.length).toBe(2)
    expect(state.resultIndex).toBeNull()
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('reports a negative index as out of bounds', () => {
    const snapshots = arrayAccessEngine([1, 2, 3], -1)
    const state = lastState(snapshots)

    expect(state.resultIndex).toBeNull()
  })

  it('reports an index past the end as out of bounds', () => {
    const snapshots = arrayAccessEngine([1, 2, 3], 5)
    const state = lastState(snapshots)

    expect(state.resultIndex).toBeNull()
  })

  it('flags exactly one INDEX_ACCESS critical junction at the target', () => {
    const snapshots = arrayAccessEngine([1, 2, 3, 4], 3)
    const junctionSteps = snapshots.filter((s) => s.criticalJunctionType === 'INDEX_ACCESS')

    expect(junctionSteps.length).toBe(1)
    expect(junctionSteps[0].activeIndices).toEqual([3])
  })
})

describe('arrayInsertEngine', () => {
  it('inserts into the middle in the normal case', () => {
    const snapshots = arrayInsertEngine([1, 2, 4, 5], 3, 2)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 3, 4, 5])
    expect(state.resultIndex).toBe(2)
  })

  it('inserts at the first index (0), shifting everything right', () => {
    const snapshots = arrayInsertEngine([2, 3, 4], 1, 0)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 3, 4])
  })

  it('inserts at the last index (append), with no shifting', () => {
    const snapshots = arrayInsertEngine([1, 2, 3], 4, 3)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 3, 4])
    const shiftSteps = snapshots.filter((s) => s.swappedIndices.length > 0)
    expect(shiftSteps.length).toBe(0)
  })

  it('inserts into an empty array', () => {
    const snapshots = arrayInsertEngine([], 7, 0)
    const state = lastState(snapshots)

    expect(state.array).toEqual([7])
    expect(state.resultIndex).toBe(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('inserts into a single-element array', () => {
    const snapshots = arrayInsertEngine([5], 9, 1)
    const state = lastState(snapshots)

    expect(state.array).toEqual([5, 9])
  })

  it('clamps a position past the end to append', () => {
    const snapshots = arrayInsertEngine([1, 2, 3], 4, 99)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 3, 4])
  })

  it('never mutates the original input array', () => {
    const input = [1, 2, 3]
    arrayInsertEngine(input, 99, 1)

    expect(input).toEqual([1, 2, 3])
  })

  it('flags exactly one INSERT_POSITION critical junction on the final step', () => {
    const snapshots = arrayInsertEngine([1, 2, 3, 4], 99, 1)
    const junctionSteps = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_POSITION')

    expect(junctionSteps.length).toBe(1)
    expect(junctionSteps[0].isFinalStep).toBe(true)
  })
})

describe('arrayDeleteEngine', () => {
  it('deletes from the middle in the normal case', () => {
    const snapshots = arrayDeleteEngine([1, 2, 3, 4, 5], 2)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 4, 5])
    expect(state.operationValue).toBe(3)
  })

  it('deletes the first index (0), shifting everything left', () => {
    const snapshots = arrayDeleteEngine([1, 2, 3, 4], 0)
    const state = lastState(snapshots)

    expect(state.array).toEqual([2, 3, 4])
  })

  it('deletes the last index, with no shifting', () => {
    const snapshots = arrayDeleteEngine([1, 2, 3, 4], 3)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2, 3])
    const shiftSteps = snapshots.filter((s) => s.swappedIndices.length > 0)
    expect(shiftSteps.length).toBe(0)
  })

  it('deletes the single element of a one-element array, leaving it empty', () => {
    const snapshots = arrayDeleteEngine([42], 0)
    const state = lastState(snapshots)

    expect(state.array).toEqual([])
    expect(state.resultIndex).toBeNull()
  })

  it('handles deleting from an already-empty array without throwing', () => {
    const snapshots = arrayDeleteEngine([], 0)
    const state = lastState(snapshots)

    expect(state.array).toEqual([])
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('clamps an out-of-range position to the last valid index', () => {
    const snapshots = arrayDeleteEngine([1, 2, 3], 99)
    const state = lastState(snapshots)

    expect(state.array).toEqual([1, 2])
  })

  it('never mutates the original input array', () => {
    const input = [1, 2, 3, 4]
    arrayDeleteEngine(input, 1)

    expect(input).toEqual([1, 2, 3, 4])
  })

  it('flags exactly one DELETE_SHIFT critical junction on the final step', () => {
    const snapshots = arrayDeleteEngine([1, 2, 3, 4], 1)
    const junctionSteps = snapshots.filter((s) => s.criticalJunctionType === 'DELETE_SHIFT')

    expect(junctionSteps.length).toBe(1)
    expect(junctionSteps[0].isFinalStep).toBe(true)
  })
})
