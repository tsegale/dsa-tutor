import { describe, it, expect } from 'vitest'
import { generateRemediationTask } from './remediationTasks'

// Mirrors the exact example values authored in
// apps/api/src/data/assessmentItemBank.ts (Phase 11B). A remediation task
// must never reuse an assessment item or its values - this test guards
// that boundary from both directions changing without the other noticing.
const FORBIDDEN_ARRAYS: number[][] = [
  [5, 2, 8, 1],
  [4, 3, 2, 1],
  [7, 7, 7, 7],
  [3, 1, 4, 1, 5],
  [1, 3, 5, 7, 9, 11, 13],
]
const CASES: Array<[string, string]> = [
  ['COMPARISON_DIRECTION', 'bubble-sort'],
  ['COMPARISON_DIRECTION', 'binary-search'],
  ['INVARIANT_MISAPPLICATION', 'bubble-sort'],
  ['PREMATURE_TERMINATION', 'bubble-sort'],
  ['BOUNDARY_CONDITION', 'binary-search'],
  ['BOUNDARY_CONDITION', 'bubble-sort'],
  ['OFF_BY_ONE', 'binary-search'],
  ['STABILITY_CONFUSION', 'bubble-sort'],
  ['STRUCTURAL_PROPERTY_VIOLATION', 'bst'],
  ['STRUCTURAL_PROPERTY_VIOLATION', 'bubble-sort'],
]

describe('generateRemediationTask', () => {
  it.each(CASES)('returns a payload for %s / %s', (category, slug) => {
    expect(generateRemediationTask(category, slug, 1)).not.toBeNull()
  })

  it.each(CASES)('%s / %s never reuses an assessment item array', (category, slug) => {
    for (const level of [1, 2, 3]) {
      const payload = generateRemediationTask(category, slug, level)
      if (payload?.array) {
        for (const forbidden of FORBIDDEN_ARRAYS) {
          expect(payload.array).not.toEqual(forbidden)
        }
      }
    }
  })

  it('returns null for an unauthored category/algorithm pair', () => {
    expect(generateRemediationTask('TRAVERSAL_ORDER_CONFUSION', 'bubble-sort', 1)).toBeNull()
  })

  it('varies scaffolding text across levels 1, 2, and 3', () => {
    const l1 = generateRemediationTask('COMPARISON_DIRECTION', 'bubble-sort', 1)
    const l2 = generateRemediationTask('COMPARISON_DIRECTION', 'bubble-sort', 2)
    const l3 = generateRemediationTask('COMPARISON_DIRECTION', 'bubble-sort', 3)
    expect(l1?.scaffold).toBeNull()
    expect(l2?.scaffold).not.toBeNull()
    expect(l3?.scaffold).not.toEqual(l2?.scaffold)
  })

  // remediation doc Phase 12A.3: a Quick Check question with no defensible
  // answer as worded (asking whether sortedness changed after a comparison
  // that left the array untouched) reached students. Every option-based
  // task must have exactly one option whose id matches correctOptionId -
  // free-response tasks (no options) are graded elsewhere and skipped here.
  it.each(CASES)('%s / %s has exactly one correct option, when it has options', (category, slug) => {
    for (const level of [1, 2, 3]) {
      const payload = generateRemediationTask(category, slug, level)
      if (!payload?.options) continue
      expect(payload.correctOptionId).not.toBeUndefined()
      const matches = payload.options.filter((option) => option.id === payload.correctOptionId)
      expect(matches, `${category}/${slug} level ${level}: options were [${payload.options.map((o) => o.id).join(', ')}], correctOptionId was "${payload.correctOptionId}"`).toHaveLength(1)
    }
  })
})

describe('assessment item bank values stay out of remediation content', () => {
  it('no generated payload contains a forbidden standalone target value in its prompt', () => {
    // A conservative spot-check: the binary-search assessment item's
    // target (9) and single-element array ([42]) must never appear as the
    // corresponding value in a remediation prompt for the same algorithm.
    const payload = generateRemediationTask('COMPARISON_DIRECTION', 'binary-search', 1)
    expect(payload?.array).not.toContain(42)
    expect(payload?.prompt.includes('target 9)')).toBe(false)
  })
})
