import { describe, it, expect } from 'vitest'
import { MisconceptionCategory } from '@dsa-tutor/types'
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

  it('returns exactly 3 snapshots for a single element array (start, algorithm-complete junction, done)', () => {
    const snapshots = bubbleSortEngine([42])

    expect(snapshots.length).toBe(3)
    expect(snapshots[1].criticalJunctionType).toBe('ALGORITHM_COMPLETE')
    expect(snapshots[1].isPredictionRequired).toBe(true)
    expect(snapshots[2].isPredictionRequired).toBe(false)
    expect(snapshots.some((s) => s.pseudocodeLine === PSEUDOCODE_SWAP)).toBe(false)
  })

  it('returns exactly 3 snapshots for an empty array without throwing', () => {
    const snapshots = bubbleSortEngine([])

    expect(snapshots.length).toBe(3)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
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

  it('gives every SWAP_DECISION junction a specific, comparison-worded description', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const swapDecisionSteps = snapshots.filter((s) => s.criticalJunctionType === 'SWAP_DECISION')

    expect(swapDecisionSteps.length).toBeGreaterThan(0)
    for (const step of swapDecisionSteps) {
      expect(step.description).toContain('Comparing')
      expect(step.description).toMatch(/index \d+/)
    }
  })

  it('skips prediction on obvious (large-difference) comparisons for a reverse sorted array', () => {
    const snapshots = bubbleSortEngine([5, 4, 3, 2, 1])
    const comparisons = snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)

    expect(comparisons.some((s) => s.isPredictionRequired)).toBe(true)
    expect(comparisons.every((s) => s.isPredictionRequired)).toBe(false)

    // Obvious comparisons are narrated but are not Critical Junctions.
    const skipped = comparisons.filter((s) => !s.isPredictionRequired)
    expect(skipped.length).toBeGreaterThan(0)
    for (const step of skipped) {
      expect(step.criticalJunctionType).toBeNull()
      expect(step.junctionDifficulty).toBeNull()
    }
  })

  it('produces exactly one PASS_COMPLETE or EARLY_TERMINATION junction per completed pass', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const passNarrations = snapshots.filter(
      (s) => s.pseudocodeLine === PSEUDOCODE_OUTER_LOOP_END && !s.isPredictionRequired,
    )
    const passCompleteJunctions = snapshots.filter((s) => s.criticalJunctionType === 'PASS_COMPLETE')
    const earlyTerminationJunctions = snapshots.filter((s) => s.criticalJunctionType === 'EARLY_TERMINATION')

    expect(passCompleteJunctions.length).toBeGreaterThan(0)
    for (const step of passCompleteJunctions.concat(earlyTerminationJunctions)) {
      expect(step.predictionType).toBe('TILE_GRID')
      expect(step.isPredictionRequired).toBe(true)
      expect(step.junctionDifficulty).toBe('CONCEPTUAL')
    }
    expect(passCompleteJunctions.length + earlyTerminationJunctions.length).toBe(passNarrations.length)
  })

  it('produces an EARLY_TERMINATION junction when sorting an already-sorted array', () => {
    const snapshots = bubbleSortEngine([1, 2, 3, 4, 5])

    expect(snapshots.some((s) => s.criticalJunctionType === 'EARLY_TERMINATION')).toBe(true)
  })

  it('places exactly one ALGORITHM_COMPLETE junction as the second-to-last snapshot', () => {
    const snapshots = bubbleSortEngine([5, 3, 1, 4, 2])
    const algorithmCompleteJunctions = snapshots.filter((s) => s.criticalJunctionType === 'ALGORITHM_COMPLETE')

    expect(algorithmCompleteJunctions.length).toBe(1)
    expect(snapshots[snapshots.length - 2].criticalJunctionType).toBe('ALGORITHM_COMPLETE')
    expect(snapshots[snapshots.length - 2].isPredictionRequired).toBe(true)
    expect(snapshots[snapshots.length - 1].criticalJunctionType).toBeNull()
  })

  describe('junctionDensity', () => {
    function comparisons(snapshots: ReturnType<typeof bubbleSortEngine>) {
      return snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)
    }

    it('ALL makes every comparison a SWAP_DECISION junction', () => {
      const snapshots = bubbleSortEngine([1, 2, 3, 4, 5], { junctionDensity: 'ALL' })
      const steps = comparisons(snapshots)
      expect(steps.length).toBeGreaterThan(0)
      expect(steps.every((s) => s.isPredictionRequired)).toBe(true)
    })

    it('SPARSE only fires on the first comparison of each pass', () => {
      const snapshots = bubbleSortEngine([5, 4, 3, 2, 1], { junctionDensity: 'SPARSE' })
      const steps = comparisons(snapshots)
      const junctions = steps.filter((s) => s.isPredictionRequired)
      const nonJunctions = steps.filter((s) => !s.isPredictionRequired)

      expect(junctions.length).toBeGreaterThan(0)
      expect(nonJunctions.length).toBeGreaterThan(0)
      // Every fired junction must be a pass's first comparison (index 0
      // of that pass), identified here by its description.
      for (const step of junctions) {
        expect(step.description).toContain('index 0')
      }
    })

    it('SPARSE fires no more junctions than STANDARD on the same array', () => {
      const sparse = comparisons(bubbleSortEngine([5, 4, 3, 2, 1], { junctionDensity: 'SPARSE' }))
      const standard = comparisons(bubbleSortEngine([5, 4, 3, 2, 1], { junctionDensity: 'STANDARD' }))
      const all = comparisons(bubbleSortEngine([5, 4, 3, 2, 1], { junctionDensity: 'ALL' }))

      const sparseCount = sparse.filter((s) => s.isPredictionRequired).length
      const standardCount = standard.filter((s) => s.isPredictionRequired).length
      const allCount = all.filter((s) => s.isPredictionRequired).length

      expect(sparseCount).toBeLessThanOrEqual(standardCount)
      expect(standardCount).toBeLessThanOrEqual(allCount)
    })

    it('defaults to STANDARD when no option is passed', () => {
      const withDefault = comparisons(bubbleSortEngine([5, 4, 3, 2, 1]))
      const explicitStandard = comparisons(bubbleSortEngine([5, 4, 3, 2, 1], { junctionDensity: 'STANDARD' }))

      expect(withDefault.map((s) => s.isPredictionRequired)).toEqual(explicitStandard.map((s) => s.isPredictionRequired))
    })

    it('scales the ambiguity threshold to the array range instead of a fixed number', () => {
      // A tightly-clustered, strictly increasing array: every adjacent gap
      // is 1, which used to fall under the old fixed threshold of 3 and
      // fire on every single comparison (the fatigue problem this phase
      // fixes). With a range-relative threshold, only the pass-first
      // comparison should still fire.
      const snapshots = bubbleSortEngine([1, 2, 3, 4, 5], { junctionDensity: 'STANDARD' })
      const steps = comparisons(snapshots)
      const junctions = steps.filter((s) => s.isPredictionRequired)
      const nonJunctions = steps.filter((s) => !s.isPredictionRequired)

      expect(nonJunctions.length).toBeGreaterThan(0)
      for (const step of junctions) {
        expect(step.description).toContain('index 0')
      }
    })
  })

  describe('topMisconception targeting', () => {
    function comparisons(snapshots: ReturnType<typeof bubbleSortEngine>) {
      return snapshots.filter((s) => s.pseudocodeLine === PSEUDOCODE_COMPARISON)
    }

    it('forces a SWAP_DECISION junction that density would have skipped', () => {
      const sparse = bubbleSortEngine([1, 2, 3, 4, 5], { junctionDensity: 'SPARSE' })
      const sparseJunctionCount = comparisons(sparse).filter((s) => s.isPredictionRequired).length

      const targeted = bubbleSortEngine([1, 2, 3, 4, 5], {
        junctionDensity: 'SPARSE',
        topMisconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
      })
      const targetedJunctionCount = comparisons(targeted).filter((s) => s.isPredictionRequired).length

      expect(targetedJunctionCount).toBeGreaterThan(sparseJunctionCount)
    })

    it('an unrelated misconception does not change junction firing', () => {
      const sparse = comparisons(bubbleSortEngine([1, 2, 3, 4, 5], { junctionDensity: 'SPARSE' }))
      const withUnrelated = comparisons(
        bubbleSortEngine([1, 2, 3, 4, 5], {
          junctionDensity: 'SPARSE',
          topMisconception: MisconceptionCategory.BASE_CASE_OMISSION,
        }),
      )
      expect(withUnrelated.map((s) => s.isPredictionRequired)).toEqual(sparse.map((s) => s.isPredictionRequired))
    })
  })
})
