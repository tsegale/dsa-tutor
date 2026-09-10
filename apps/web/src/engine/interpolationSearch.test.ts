import { describe, it, expect } from 'vitest'
import { interpolationSearchEngine, type InterpolationSearchState } from './interpolationSearch'

function lastState(snapshots: ReturnType<typeof interpolationSearchEngine>): InterpolationSearchState {
  return snapshots[snapshots.length - 1].dataStructureState as InterpolationSearchState
}

describe('interpolationSearchEngine', () => {
  it('finds a target present in a uniformly distributed array', () => {
    const snapshots = interpolationSearchEngine([1, 3, 5, 7, 9, 11, 13, 15, 17, 19], 7)
    const state = lastState(snapshots)
    expect(state.found).toBe(true)
    expect(state.array[state.foundIndex!]).toBe(7)
  })

  it('finds the first element', () => {
    const snapshots = interpolationSearchEngine([2, 4, 6, 8, 10], 2)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('finds the last element', () => {
    const snapshots = interpolationSearchEngine([2, 4, 6, 8, 10], 10)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('reports not found for a target outside the array range', () => {
    const snapshots = interpolationSearchEngine([1, 3, 5, 7, 9], 99)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('reports not found for a target within range but absent', () => {
    const snapshots = interpolationSearchEngine([1, 3, 5, 7, 9], 4)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = interpolationSearchEngine([], 5)
    expect(lastState(snapshots).found).toBe(false)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('handles a single-element array (found)', () => {
    const snapshots = interpolationSearchEngine([7], 7)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('handles a single-element array (not found)', () => {
    const snapshots = interpolationSearchEngine([7], 3)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('handles an array where every value is identical, without a divide-by-zero crash', () => {
    const snapshots = interpolationSearchEngine([5, 5, 5, 5], 5)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('flags a PROBE_POSITION junction with a formula string on every probe', () => {
    const snapshots = interpolationSearchEngine([1, 3, 5, 7, 9, 11, 13, 15, 17, 19], 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'PROBE_POSITION')
    expect(junctions.length).toBeGreaterThan(0)
    for (const j of junctions) {
      expect((j.dataStructureState as InterpolationSearchState).probeFormula).not.toBe('')
    }
  })

  it('has sequential stepIndex values', () => {
    const snapshots = interpolationSearchEngine([1, 3, 5, 7, 9], 5)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
