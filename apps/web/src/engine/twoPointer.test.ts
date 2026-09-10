import { describe, it, expect } from 'vitest'
import { twoSumSortedEngine, palindromeCheckEngine, type TwoPointerState } from './twoPointer'

function lastState(snapshots: { dataStructureState: unknown }[]): TwoPointerState {
  return snapshots[snapshots.length - 1].dataStructureState as TwoPointerState
}

describe('twoSumSortedEngine', () => {
  it('finds a pair that sums to the target', () => {
    const snapshots = twoSumSortedEngine([1, 2, 4, 6, 8, 10, 12], 14)
    const state = lastState(snapshots)
    expect(state.found).toBe(true)
    const [l, r] = state.foundPair!
    expect(Number(state.array[l]) + Number(state.array[r])).toBe(14)
  })

  it('finds the pair at the very ends of the array', () => {
    const snapshots = twoSumSortedEngine([1, 2, 3, 9], 10)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('reports no solution when none exists', () => {
    const snapshots = twoSumSortedEngine([1, 2, 3], 100)
    expect(lastState(snapshots).found).toBe(false)
  })

  it('handles an array with fewer than 2 elements', () => {
    const snapshots = twoSumSortedEngine([5], 10)
    expect(lastState(snapshots).found).toBe(false)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('sorts an unsorted input internally', () => {
    const snapshots = twoSumSortedEngine([8, 2, 10, 4, 1], 14)
    expect(lastState(snapshots).found).toBe(true)
  })

  it('flags one POINTER_MOVE junction per comparison', () => {
    const snapshots = twoSumSortedEngine([1, 2, 4, 6, 8], 6)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'POINTER_MOVE')
    expect(junctions.length).toBeGreaterThan(0)
  })

  it('never mutates the original input array', () => {
    const input = [3, 1, 2]
    twoSumSortedEngine(input, 3)
    expect(input).toEqual([3, 1, 2])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = twoSumSortedEngine([1, 2, 4, 6, 8], 6)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('palindromeCheckEngine', () => {
  it('identifies a true palindrome', () => {
    const snapshots = palindromeCheckEngine(['r', 'a', 'c', 'e', 'c', 'a', 'r'])
    expect(lastState(snapshots).found).toBe(true)
  })

  it('identifies a non-palindrome', () => {
    const snapshots = palindromeCheckEngine(['h', 'e', 'l', 'l', 'o'])
    expect(lastState(snapshots).found).toBe(false)
  })

  it('treats an empty array as a palindrome', () => {
    const snapshots = palindromeCheckEngine([])
    expect(lastState(snapshots).found).toBe(true)
  })

  it('treats a single character as a palindrome', () => {
    const snapshots = palindromeCheckEngine(['a'])
    expect(lastState(snapshots).found).toBe(true)
  })

  it('treats a two-character palindrome correctly', () => {
    const snapshots = palindromeCheckEngine(['a', 'a'])
    expect(lastState(snapshots).found).toBe(true)
  })

  it('treats two different characters as not a palindrome', () => {
    const snapshots = palindromeCheckEngine(['a', 'b'])
    expect(lastState(snapshots).found).toBe(false)
  })

  it('stops early at the first mismatch rather than comparing the whole string', () => {
    const snapshots = palindromeCheckEngine(['a', 'b', 'c', 'd', 'e'])
    const comparisons = snapshots.filter((s) => s.criticalJunctionType === 'POINTER_MOVE')
    expect(comparisons.length).toBe(1)
  })

  it('never mutates the original input array', () => {
    const input = ['r', 'a', 'c', 'e', 'c', 'a', 'r']
    palindromeCheckEngine(input)
    expect(input).toEqual(['r', 'a', 'c', 'e', 'c', 'a', 'r'])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = palindromeCheckEngine(['a', 'b', 'a'])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
