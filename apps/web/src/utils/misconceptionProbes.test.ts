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
    expect(isProbingJunction('COMPARISON_DIRECTION', 'BST_DIRECTION')).toBe(false)
  })
})
