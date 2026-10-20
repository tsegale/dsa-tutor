import { describe, expect, it } from 'vitest'
import complexity from '../../../ai/data/complexity.json'
import { getAlgorithmRegistryEntry } from './registry'

/**
 * An animation must not contradict the complexity it is printed next to.
 *
 * Array Access used to step from index 0 up to the target, narrating
 * "Locating index 1 on the way to index 2". Its complexity table said
 * O(1) always, its pseudocode said `return arr[index]`, and its Theory tab
 * said you do not walk the array. The canvas said the opposite, and the
 * canvas is the thing a student watches.
 *
 * The invariant that catches that class of defect: a topic claiming a
 * constant-time worst case must take the same number of steps whatever the
 * size of the structure it is given. Anything that grows with n is a linear
 * scan being animated under a constant-time claim.
 */

const CLAIMS_CONSTANT = Object.entries(complexity as Record<string, { worst: string }>)
  .filter(([, facts]) => facts.worst === 'O(1)')
  .map(([slug]) => slug)

const ascending = (length: number) => Array.from({ length }, (_unused, i) => (i + 1) * 10)

describe('topics claiming a constant-time worst case', () => {
  it('finds the topics to check', () => {
    // If complexity.json were renamed or reshaped this would silently pass
    // over everything, so assert the set is real before relying on it.
    expect(CLAIMS_CONSTANT.length).toBeGreaterThan(3)
    expect(CLAIMS_CONSTANT).toContain('array-access')
  })

  it.each(CLAIMS_CONSTANT)('%s animates the same number of steps whatever the size', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)
    if (!entry) return
    const counts = [5, 12, 30].map((length) => entry.engineFunction(ascending(length)).length)
    expect(new Set(counts).size, `${slug} step counts: ${counts.join(', ')}`).toBe(1)
  })

  it.each(CLAIMS_CONSTANT)('%s never narrates walking towards its target', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)
    if (!entry) return
    for (const snapshot of entry.engineFunction(ascending(20))) {
      expect(snapshot.description, slug).not.toMatch(/on the way to|scanning|one at a time/i)
    }
  })
})
