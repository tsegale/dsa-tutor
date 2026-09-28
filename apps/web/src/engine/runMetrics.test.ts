import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, JunctionDifficulty, MisconceptionCategory } from '@dsa-tutor/types'
import { bubbleSortEngine } from './bubbleSort'
import { binarySearchEngine } from './binarySearch'
import { bstInsertEngine } from './bst'
import { complexityPredictionOptions } from './runMetrics'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { comparisonFormula, isRunCountHidden } from '@/utils/complexityFormula'
import { isWorkedStep } from '@/utils/workedSteps'
import { ScaffoldingLevel } from '@dsa-tutor/types'

const finalMetrics = (snapshots: ReturnType<typeof bubbleSortEngine>) => snapshots[snapshots.length - 1].metrics

describe('run counters', () => {
  it('match a hand count on [5,3,1,4,2]: 10 comparisons, 7 swaps', () => {
    // Pass 1: 4 comparisons, 4 swaps. Pass 2: 3, 2. Pass 3: 2, 1. Pass 4: 1, 0 (no swap - stops).
    expect(finalMetrics(bubbleSortEngine([5, 3, 1, 4, 2]))).toEqual({ n: 5, comparisons: 10, swaps: 7 })
  })

  it('meet the formula at n=5 and n=8 for a run that never stops early', () => {
    expect(finalMetrics(bubbleSortEngine([5, 3, 1, 4, 2]))?.comparisons).toBe(comparisonFormula('bubble-sort', 5)?.value)
    expect(finalMetrics(bubbleSortEngine([8, 7, 6, 5, 4, 3, 2, 1]))?.comparisons).toBe(comparisonFormula('bubble-sort', 8)?.value)
    expect(comparisonFormula('bubble-sort', 8)?.value).toBe(28)
  })

  it('are cumulative and never decrease', () => {
    const counts = bubbleSortEngine([5, 3, 1, 4, 2]).map((s) => s.metrics!.comparisons)
    expect(counts.every((c, i) => i === 0 || c >= counts[i - 1])).toBe(true)
    expect(counts[0]).toBe(0)
  })

  it('count binary search probes within floor(log2 n) + 1', () => {
    const metrics = finalMetrics(binarySearchEngine([1, 3, 5, 7, 9, 11, 13], 13))!
    expect(metrics.comparisons).toBe(metrics.visits)
    expect(metrics.comparisons).toBeGreaterThan(0)
    expect(metrics.comparisons).toBeLessThanOrEqual(comparisonFormula('binary-search', 7)!.value)
  })

  it('count BST node comparisons: [8,4,12,2,6] makes 0+1+1+2+2 = 6', () => {
    expect(finalMetrics(bstInsertEngine([8, 4, 12, 2, 6]))).toEqual({ n: 5, comparisons: 6, visits: 6 })
  })
})

describe('COMPLEXITY_PREDICTION junction', () => {
  const run = bubbleSortEngine([5, 3, 1, 4, 2], { withComplexityPrediction: true })
  const index = run.findIndex((s) => s.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION)
  const junction = run[index]

  it('is absent unless asked for', () => {
    expect(bubbleSortEngine([5, 3, 1, 4, 2]).some((s) => s.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION)).toBe(false)
  })

  it('fires once, after ALGORITHM_COMPLETE and just before the final summary', () => {
    expect(run.filter((s) => s.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION)).toHaveLength(1)
    expect(index).toBe(run.length - 2)
    expect(run.findIndex((s) => s.criticalJunctionType === CriticalJunctionType.ALGORITHM_COMPLETE)).toBeLessThan(index)
    expect(run[run.length - 1].isFinalStep).toBe(true)
    expect(run.map((s) => s.stepIndex)).toEqual(run.map((_, i) => i))
  })

  it('is conceptual - asked at every level, never worked', () => {
    expect(junction.junctionDifficulty).toBe(JunctionDifficulty.CONCEPTUAL)
    for (const level of Object.values(ScaffoldingLevel)) expect(isWorkedStep(run, index, level)).toBe(false)
  })

  it('asks without giving the count away, and offers the measured count as the correct tile', () => {
    expect(getPromptForSnapshot(junction, 'Bubble Sort')).toBe('This run sorted 5 elements. Roughly how many comparisons did it make?')
    expect(getPromptForSnapshot(junction, 'Bubble Sort')).not.toContain('10')
    const tiles = getTilesForSnapshot(junction, 'Bubble Sort')
    expect(tiles.find((t) => t.id === 'correct')?.label).toBe('10 comparisons')
    const wrong = tiles.filter((t) => t.id !== 'correct')
    expect(wrong).toHaveLength(3)
    expect(wrong.every((t) => t.misconception === MisconceptionCategory.COMPLEXITY_MISATTRIBUTION)).toBe(true)
    expect(new Set(tiles.map((t) => t.label)).size).toBe(4)
  })

  it('is added on all three study engines', () => {
    const has = (s: ReturnType<typeof bubbleSortEngine>) => s.some((x) => x.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION)
    expect(has(binarySearchEngine([1, 3, 5, 7, 9], 9, { withComplexityPrediction: true }))).toBe(true)
    expect(has(bstInsertEngine([8, 4, 12], { withCompletionCheck: true, withComplexityPrediction: true }))).toBe(true)
  })
})

describe('complexityPredictionOptions', () => {
  it('keeps all four counts distinct when the measured count collides with a wrong candidate', () => {
    // Already-sorted n=5 bubble sort makes n-1 = 4 comparisons - the same as the "linear" candidate.
    const { correct, wrong } = complexityPredictionOptions(5, 4)
    expect(new Set([correct, ...wrong]).size).toBe(4)
    expect(wrong).not.toContain(4)
  })
})

describe('Complexity tab lock', () => {
  it('hides the count before and during the count question, and shows it after', () => {
    const run = bubbleSortEngine([5, 3, 1, 4, 2], { withComplexityPrediction: true })
    const question = run.findIndex((s) => s.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION)
    expect(isRunCountHidden(run, 0)).toBe(true)
    expect(isRunCountHidden(run, question)).toBe(true)
    expect(isRunCountHidden(run, question + 1)).toBe(false)
  })

  it('never hides it on a run without a count question', () => {
    expect(isRunCountHidden(bubbleSortEngine([5, 3, 1, 4, 2]), 0)).toBe(false)
  })
})
