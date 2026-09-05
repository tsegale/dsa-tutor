import { describe, it, expect } from 'vitest'
import { mergeSortEngine, type MergeSortState } from './mergeSort'

function lastState(snapshots: ReturnType<typeof mergeSortEngine>): MergeSortState {
  return snapshots[snapshots.length - 1].dataStructureState as MergeSortState
}

function countMergeDecisions(snapshots: ReturnType<typeof mergeSortEngine>): number {
  return snapshots.filter((s) => s.criticalJunctionType === 'MERGE_DECISION').length
}

describe('mergeSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = mergeSortEngine([5, 2, 8, 1, 9, 3, 7, 4])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(lastState(snapshots).array).toEqual([1, 2, 3, 4, 5, 7, 8, 9])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  // Unlike Bubble/Insertion Sort, bottom-up Merge Sort is NOT adaptive:
  // the merge structure (how many merges of what size) depends only on
  // n, never on the input's existing order, so a sorted and a reverse
  // sorted array of the same length always produce the same number of
  // merge operations - and therefore the same number of MERGE_DECISION
  // junctions, since exactly one fires per merge operation.
  it('produces the same number of MERGE_DECISION junctions regardless of input order (non-adaptive)', () => {
    const sorted = mergeSortEngine([1, 2, 3, 4, 5, 6, 7, 8])
    const reversed = mergeSortEngine([8, 7, 6, 5, 4, 3, 2, 1])

    expect(countMergeDecisions(sorted)).toBe(countMergeDecisions(reversed))
    expect(lastState(reversed).array).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('returns exactly 2 snapshots for an empty array without throwing', () => {
    const snapshots = mergeSortEngine([])

    expect(snapshots.length).toBe(2)
    expect(snapshots[1].isFinalStep).toBe(true)
  })

  it('returns exactly 2 snapshots for a single-element array with no merges', () => {
    const snapshots = mergeSortEngine([42])

    expect(snapshots.length).toBe(2)
    expect(countMergeDecisions(snapshots)).toBe(0)
    expect(lastState(snapshots).array).toEqual([42])
  })

  it('performs exactly one merge decision for a two-element array', () => {
    const snapshots = mergeSortEngine([2, 1])

    expect(countMergeDecisions(snapshots)).toBe(1)
    expect(lastState(snapshots).array).toEqual([1, 2])
  })

  it('sorts an array with duplicate values correctly', () => {
    const snapshots = mergeSortEngine([3, 1, 3, 2])

    expect(lastState(snapshots).array).toEqual([1, 2, 3, 3])
  })

  it('breaks a tie between equal values by taking the left run first on the first comparison (stability)', () => {
    const snapshots = mergeSortEngine([5, 5, 3, 1])
    const decisionIndex = snapshots.findIndex((s) => {
      if (s.criticalJunctionType !== 'MERGE_DECISION') return false
      const state = s.dataStructureState as MergeSortState
      return state.array[state.leftRegion[0]] === state.array[state.rightRegion[0]]
    })

    expect(decisionIndex).toBeGreaterThanOrEqual(0)
    const decisionState = snapshots[decisionIndex].dataStructureState as MergeSortState
    const nextState = snapshots[decisionIndex + 1].dataStructureState as MergeSortState

    // The left pointer should have advanced (its element was taken);
    // the right pointer should be untouched.
    expect(nextState.leftRegion[0]).toBeGreaterThan(decisionState.leftRegion[0])
    expect(nextState.rightRegion[0]).toBe(decisionState.rightRegion[0])
  })

  it('uses clean doubling pass sizes for a power-of-2 length array', () => {
    const snapshots = mergeSortEngine([5, 2, 8, 1, 9, 3, 7, 4])
    const passCompletes = snapshots.filter((s) => s.criticalJunctionType === 'PASS_COMPLETE')
    const passSizes = passCompletes.map((s) => (s.dataStructureState as MergeSortState).passSize)

    expect(passSizes).toEqual([1, 2, 4])
  })

  it('handles a non-power-of-2 length array without crashing', () => {
    const snapshots = mergeSortEngine([5, 2, 8, 1, 9])

    expect(lastState(snapshots).array).toEqual([1, 2, 5, 8, 9])
    expect(snapshots.length).toBeGreaterThan(0)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = mergeSortEngine([5, 2, 8, 1, 9, 3, 7, 4])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [5, 2, 8, 1, 9, 3, 7, 4]
    const originalCopy = [...original]

    const snapshots = mergeSortEngine(original)
    expect(original).toEqual(originalCopy)

    const mutable = (snapshots[0].dataStructureState as MergeSortState).array
    mutable.push(999)
    expect((snapshots[1].dataStructureState as MergeSortState).array).not.toContain(999)
  })
})
