import { describe, it, expect } from 'vitest'
import { fixedWindowEngine, variableWindowEngine, type SlidingWindowState } from './slidingWindow'

function lastState(snapshots: { dataStructureState: unknown }[]): SlidingWindowState {
  return snapshots[snapshots.length - 1].dataStructureState as SlidingWindowState
}

describe('fixedWindowEngine', () => {
  it('finds the maximum sum window of the given size', () => {
    const snapshots = fixedWindowEngine([2, 1, 5, 1, 3, 2, 4, 1], 3)
    const state = lastState(snapshots)
    // windows of size 3: [2,1,5]=8 [1,5,1]=7 [5,1,3]=9 [1,3,2]=6 [3,2,4]=9 [2,4,1]=7
    expect(state.bestSum).toBe(9)
  })

  it('handles a window size equal to the array length', () => {
    const snapshots = fixedWindowEngine([1, 2, 3], 3)
    expect(lastState(snapshots).bestSum).toBe(6)
  })

  it('handles a window size of 1', () => {
    const snapshots = fixedWindowEngine([1, 5, 2], 1)
    expect(lastState(snapshots).bestSum).toBe(5)
  })

  it('clamps a window size larger than the array', () => {
    const snapshots = fixedWindowEngine([1, 2, 3], 10)
    expect(lastState(snapshots).bestSum).toBe(6)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = fixedWindowEngine([], 3)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('flags exactly one WINDOW_SUM junction at the initial position', () => {
    const snapshots = fixedWindowEngine([1, 2, 3, 4, 5], 2)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'WINDOW_SUM')
    expect(junctions.length).toBe(1)
  })

  it('flags one WINDOW_EXPAND junction per slide', () => {
    const snapshots = fixedWindowEngine([1, 2, 3, 4, 5], 2)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'WINDOW_EXPAND')
    expect(junctions.length).toBe(3) // n=5, k=2 -> 3 slides
  })

  it('never mutates the original input array', () => {
    const input = [2, 1, 5, 1, 3]
    fixedWindowEngine(input, 2)
    expect(input).toEqual([2, 1, 5, 1, 3])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = fixedWindowEngine([1, 2, 3, 4], 2)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('variableWindowEngine', () => {
  it('finds the smallest subarray meeting the target sum', () => {
    const snapshots = variableWindowEngine([2, 3, 1, 2, 4, 3], 7)
    const state = lastState(snapshots)
    // smallest window with sum >= 7 is [4,3] (length 2)
    expect(state.bestEnd! - state.bestStart! + 1).toBe(2)
  })

  it('handles a target met by the whole array only', () => {
    const snapshots = variableWindowEngine([1, 1, 1, 1], 4)
    const state = lastState(snapshots)
    expect(state.bestStart).toBe(0)
    expect(state.bestEnd).toBe(3)
  })

  it('reports no solution when the target is unreachable', () => {
    const snapshots = variableWindowEngine([1, 1, 1], 100)
    const state = lastState(snapshots)
    expect(state.bestStart).toBeNull()
    expect(state.bestEnd).toBeNull()
  })

  it('handles an empty array without throwing', () => {
    const snapshots = variableWindowEngine([], 5)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('handles a single element meeting the target', () => {
    const snapshots = variableWindowEngine([10], 5)
    const state = lastState(snapshots)
    expect(state.bestStart).toBe(0)
    expect(state.bestEnd).toBe(0)
  })

  it('flags one WINDOW_EXPAND junction per right-pointer advance', () => {
    const snapshots = variableWindowEngine([2, 3, 1, 2, 4, 3], 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'WINDOW_EXPAND')
    expect(junctions.length).toBe(6)
  })

  it('never mutates the original input array', () => {
    const input = [2, 3, 1, 2, 4, 3]
    variableWindowEngine(input, 7)
    expect(input).toEqual([2, 3, 1, 2, 4, 3])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = variableWindowEngine([2, 3, 1, 2, 4, 3], 7)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
