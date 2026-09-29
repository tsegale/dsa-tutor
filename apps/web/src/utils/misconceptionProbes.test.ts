import { describe, it, expect } from 'vitest'
import { MISCONCEPTION_PROBE_MAP, COVERED_MISCONCEPTION_CATEGORIES, getProbingJunctions, getRemediationTaskType, isProbingJunction } from './misconceptionProbes'

describe('MISCONCEPTION_PROBE_MAP coverage', () => {
  it('covers at least the nine study-scope categories from the remediation doc', () => {
    expect(COVERED_MISCONCEPTION_CATEGORIES.length).toBeGreaterThanOrEqual(9)
  })

  // The whole point: a future category added to the taxonomy must not be
  // usable until it has a response path, so every covered category must
  // have both halves filled in, not just be present as a key.
  it.each(COVERED_MISCONCEPTION_CATEGORIES)('category %s has at least one probing junction and a remediation task type', (category) => {
    const mapping = MISCONCEPTION_PROBE_MAP[category]
    expect(mapping).toBeDefined()
    expect(mapping!.probingJunctions.length).toBeGreaterThan(0)
    expect(mapping!.remediationTaskType).toBeTruthy()
  })
})

describe('getProbingJunctions / getRemediationTaskType / isProbingJunction', () => {
  it('returns an empty array for an unmapped category', () => {
    expect(getProbingJunctions('NOT_A_REAL_CATEGORY')).toEqual([])
  })

  it('returns null remediation task type for an unmapped category', () => {
    expect(getRemediationTaskType('NOT_A_REAL_CATEGORY')).toBeNull()
  })

  it('identifies a junction that probes a given category', () => {
    expect(isProbingJunction('COMPARISON_DIRECTION', 'SWAP_DECISION')).toBe(true)
  })

  it('rejects a junction that does not probe a given category', () => {
    // (BST_DIRECTION now probes COMPARISON_DIRECTION: its go-left/go-right
    // tiles carry that label.) The early-stop question cannot reveal it.
    expect(isProbingJunction('COMPARISON_DIRECTION', 'EARLY_TERMINATION')).toBe(false)
    expect(isProbingJunction('ORDER_OF_OPERATIONS', 'MIDPOINT_DECISION')).toBe(false)
  })
})

// ---------------------------------------------------------------- Week 3 3C.2
import { CriticalJunctionType as CJT, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { bstDeleteEngine, bstInsertEngine, type BSTState } from '@/engine/bst'
import { getTilesForSnapshot } from './tileBuilder'
import { correctTileIdFor } from './correctTile'
import { generateRemediationTask } from './remediationTasks'

const DISPLAY: Record<string, string> = { 'bubble-sort': 'Bubble Sort', 'binary-search': 'Binary Search', bst: 'Binary Search Tree' }

function studyRuns(): Array<[string, AlgorithmSnapshot[]]> {
  const runs: Array<[string, AlgorithmSnapshot[]]> = []
  for (const input of [[5, 3, 1, 4, 2], [1, 2, 3, 4, 5], [4, 4, 4], [3, 1, 3, 2], [2, 1], [9, 7, 8, 6]]) {
    runs.push(['bubble-sort', bubbleSortEngine(input, { withComplexityPrediction: true })])
  }
  const sorted = [2, 4, 6, 8, 10, 12, 14]
  for (const target of [2, 8, 14, 5, 1, 15]) {
    runs.push(['binary-search', binarySearchEngine(sorted, target, { withComplexityPrediction: true })])
  }
  for (const order of [[40, 20, 60, 10, 30, 50, 70, 30], [10, 20, 30, 40], [30, 10]]) {
    runs.push(['bst', bstInsertEngine(order, { withCompletionCheck: true, withComplexityPrediction: true })])
    const root = (bstInsertEngine(order).at(-1)?.dataStructureState as BSTState).root
    for (const target of order) runs.push(['bst', bstDeleteEngine(root, target)])
  }
  return runs
}

/** (topic, category) -> the junction types whose wrong tiles carry that category. */
function producedCategories(): Map<string, Set<string>> {
  const produced = new Map<string, Set<string>>()
  for (const [topic, run] of studyRuns()) {
    for (const snapshot of run) {
      if (!snapshot.isPredictionRequired || !snapshot.criticalJunctionType) continue
      const correct = correctTileIdFor(snapshot)
      for (const tile of getTilesForSnapshot(snapshot, DISPLAY[topic])) {
        if (tile.id === correct || !tile.misconception) continue
        const key = `${topic}|${tile.misconception}`
        if (!produced.has(key)) produced.set(key, new Set())
        produced.get(key)!.add(snapshot.criticalJunctionType)
      }
    }
  }
  return produced
}

describe('every category a study tile can produce has a full response path', () => {
  const produced = producedCategories()

  it('finds the categories the study topics actually produce', () => {
    expect([...produced.keys()].sort()).toEqual(expect.arrayContaining(['bubble-sort|ORDER_OF_OPERATIONS', 'bst|TRAVERSAL_ORDER_CONFUSION']))
  })

  it.each([...produced.keys()])('%s is mapped, probed by a junction that can reveal it, and remediated at every level', (key) => {
    const [topic, category] = key.split('|')
    const mapping = MISCONCEPTION_PROBE_MAP[category as keyof typeof MISCONCEPTION_PROBE_MAP]
    expect(mapping, `${category} is not mapped`).toBeDefined()
    const revealing = produced.get(key)!
    expect(
      mapping!.probingJunctions.some((j) => revealing.has(j)),
      `${category} on ${topic} is revealed by [${[...revealing]}] but probed only by [${mapping!.probingJunctions}]`,
    ).toBe(true)

    const tasks = [1, 2, 3].map((level) => generateRemediationTask(category, topic, level))
    expect(tasks.every(Boolean), `${category} on ${topic} lacks authored remediation`).toBe(true)
    expect(tasks.map((t) => t!.taskType)).toEqual(['MICRO_PREDICTION', mapping!.remediationTaskType, 'WORKED_EXAMPLE'])
    expect(tasks[1]!.consequence, 'level 2 shows the consequence').toBeDefined()
    expect(tasks[2]!.scaffold, 'level 3 has a worked example').toBeTruthy()
  })

  it('probes complexity with the real count question', () => {
    expect(getProbingJunctions('COMPLEXITY_MISATTRIBUTION')).toContain(CJT.COMPLEXITY_PREDICTION)
  })
})
