import { describe, it, expect } from 'vitest'
import { bubbleSortEngine } from './bubbleSort'

const PSEUDOCODE_COMPARISON = 2
const PSEUDOCODE_SWAP = 3
const PSEUDOCODE_OUTER_LOOP_END = 5

function countPasses(snapshots: ReturnType<typeof bubbleSortEngine>): number {
  return snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_OUTER_LOOP_END).length
}

describe('bubbleSortEngine', () => {
  it('sorts a normal unsorted array and marks the last snapshot final', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const last = snapshots[snapshots.length - 1]

    expect(last.isFinalStep).toBe(true)
    expect(last.dataStructureState).toEqual([1, 2, 3, 4, 5])
    expect(snapshots.some((s) => s.isPredictionRequired)).toBe(true)
  })

  it('terminates early on an already sorted array', () => {
    const sorted = bubbleSortEngine([1, 2, 3, 4, 5])
    const unsorted = bubbleSortEngine([5, 3, 1, 4, 2])

    expect(countPasses(sorted)).toBeLessThan(countPasses(unsorted))
  })

  it('produces the maximum number of swaps on a reverse sorted array', () => {
    const snapshots = bubbleSortEngine([5, 4, 3, 2, 1])
    const comparisons = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)
    const swaps = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_SWAP)

    expect(swaps.length).toBe(comparisons.length)
    expect(swaps.length).toBe(10) // n(n-1)/2 for n=5
  })

  it('returns exactly 2 snapshots for a single element array', () => {
    const snapshots = bubbleSortEngine([42])

    expect(snapshots.length).toBe(2)
    expect(snapshots.every((s) => !s.isPredictionRequired)).toBe(true)
    expect(snapshots.some((s) => s.pseudocodeLine === PSEUDOCODE_SWAP)).toBe(false)
  })

  it('returns exactly 2 snapshots for an empty array without throwing', () => {
    const snapshots = bubbleSortEngine([])

    expect(snapshots.length).toBe(2)
    expect(snapshots[1].isFinalStep).toBe(true)
  })

  it('does not swap equal elements', () => {
    const snapshots = bubbleSortEngine([3, 1, 3, 2])

    const equalComparisonIndex = snapshots.findIndex((s) => {
      if (s.pseudocodeLine !== PSEUDOCODE_COMPARISON) return false
      const [a, b] = s.activeIndices
      const state = s.dataStructureState as number[]
      return state[a] === state[b]
    })

    expect(equalComparisonIndex).toBeGreaterThanOrEqual(0)
    expect(snapshots[equalComparisonIndex].swappedIndices).toEqual([])
    expect(snapshots[equalComparisonIndex + 1].pseudocodeLine).not.toBe(PSEUDOCODE_SWAP)
  })

  it('swaps exactly once on a two element array', () => {
    const snapshots = bubbleSortEngine([2, 1])
    const swaps = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_SWAP)

    expect(swaps.length).toBe(1)
    expect(snapshots[snapshots.length - 1].dataStructureState).toEqual([1, 2])
  })

  it('keeps every snapshot independent (no shared references, no input mutation)', () => {
    const original = [5, 3, 1, 4, 2]
    const originalCopy = [...original]

    const snapshots = bubbleSortEngine(original)
    expect(original).toEqual(originalCopy)

    expect(snapshots[0].dataStructureState).not.toBe(snapshots[1].dataStructureState)

    const mutable = snapshots[0].dataStructureState as number[]
    mutable.push(999)
    expect(snapshots[1].dataStructureState).not.toContain(999)

    const secondCall = bubbleSortEngine(original)
    ;(snapshots as unknown[]).push({})
    expect(secondCall.length).not.toBe(snapshots.length)
    expect(secondCall.length).toBeGreaterThan(0)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every prediction-required snapshot a specific, comparison-worded description', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const predictionSteps = snapshots.filter((s) => s.isPredictionRequired)

    expect(predictionSteps.length).toBeGreaterThan(0)
    for (const step of predictionSteps) {
      expect(step.description).toContain('Comparing')
      expect(step.description).toMatch(/index \d+/)
    }
  })
})
