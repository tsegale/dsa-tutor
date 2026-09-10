import { describe, it, expect } from 'vitest'
import { jumpSearchEngine, type JumpSearchState } from './jumpSearch'

function lastState(snapshots: ReturnType<typeof jumpSearchEngine>): JumpSearchState {
  return snapshots[snapshots.length - 1].dataStructureState as JumpSearchState
}

describe('jumpSearchEngine', () => {
  it('finds a target present in the array', () => {
    const snapshots = jumpSearchEngine([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21], 15)
    const state = lastState(snapshots)
    expect(state.found).toBe(true)
    expect(state.array[state.foundIndex!]).toBe(15)
  })

  it('finds the first element', () => {
    const snapshots = jumpSearchEngine([2, 4, 6, 8, 10], 2)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('finds the last element', () => {
    const snapshots = jumpSearchEngine([2, 4, 6, 8, 10], 10)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('reports not found for a target absent from the array', () => {
    const snapshots = jumpSearchEngine([1, 3, 5, 7, 9], 4)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('handles an empty array without throwing', () => {
    const snapshots = jumpSearchEngine([], 5)
    expect(lastState(snapshots).found).toBe(false)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('handles a single-element array (found)', () => {
    const snapshots = jumpSearchEngine([7], 7)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('handles a single-element array (not found)', () => {
    const snapshots = jumpSearchEngine([7], 3)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('sorts an unsorted input internally', () => {
    const snapshots = jumpSearchEngine([9, 1, 5, 3, 7], 5)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('flags exactly one JUMP_SIZE critical junction, at the start', () => {
    const snapshots = jumpSearchEngine([1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'JUMP_SIZE')
    expect(junctions.length).toBe(1)
    expect(junctions[0].stepIndex).toBe(0)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = jumpSearchEngine([1, 2, 3, 4, 5, 6], 4)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = jumpSearchEngine([1, 2, 3, 4, 5, 6], 4)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})
