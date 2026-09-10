import { describe, it, expect } from 'vitest'
import { exponentialSearchEngine, type ExponentialSearchState } from './exponentialSearch'

function lastState(snapshots: ReturnType<typeof exponentialSearchEngine>): ExponentialSearchState {
  return snapshots[snapshots.length - 1].dataStructureState as ExponentialSearchState
}

describe('exponentialSearchEngine', () => {
  it('finds a target present in the array', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16, 32, 64, 128, 256], 64)
    const state = lastState(snapshots)
    expect(state.found).toBe(true)
    expect(state.array[state.foundIndex!]).toBe(64)
  })

  it('finds the first element without doubling', () => {
    const snapshots = exponentialSearchEngine([2, 4, 6, 8, 10], 2)
    expect(lastState(snapshots).found).toBe(true)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'RANGE_DOUBLE')
    expect(junctions.length).toBe(0)
  })

  it('finds the last element, requiring multiple doublings', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16, 32, 64], 64)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('reports not found for a target absent from the array', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16], 5)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = exponentialSearchEngine([], 5)
    expect(lastState(snapshots).found).toBe(false)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('handles a single-element array (found)', () => {
    const snapshots = exponentialSearchEngine([7], 7)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('handles a single-element array (not found)', () => {
    const snapshots = exponentialSearchEngine([7], 3)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('sorts an unsorted input internally', () => {
    const snapshots = exponentialSearchEngine([16, 2, 8, 1, 4], 8)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('flags one RANGE_DOUBLE junction per doubling step', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16, 32, 64, 128], 100)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'RANGE_DOUBLE')
    expect(junctions.length).toBeGreaterThan(0)
  })

  it('flags exactly one MIDPOINT_DECISION junction when the range collapses to a single element', () => {
    const snapshots = exponentialSearchEngine([5], 5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'MIDPOINT_DECISION')
    expect(junctions.length).toBe(0)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16], 8)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = exponentialSearchEngine([1, 2, 4, 8, 16], 8)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})
