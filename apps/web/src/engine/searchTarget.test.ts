import { describe, expect, it } from 'vitest'
import { runFor } from './runFor'
import { autoSearchTarget, getAlgorithmRegistryEntry } from './registry'
import { binarySearchEngine } from './binarySearch'
import { complexityJunctionEnabled } from '@/utils/studyCondition'

/** The target a run actually searched for, read from its first step. */
function searchedFor(slug: string, values?: number[], target?: number): number {
  const first = runFor(slug, values, target === undefined ? {} : { target })[0]
  const m = first.description.match(/target (-?\d+(?:\.\d+)?)/i)
  if (!m) throw new Error(`no target in: ${first.description}`)
  return Number(m[1])
}

describe('autoSearchTarget', () => {
  it('keeps each topic\'s usual target on its own default array', () => {
    for (const slug of ['linear-search', 'binary-search']) {
      const entry = getAlgorithmRegistryEntry(slug)!
      expect(autoSearchTarget(slug, entry.defaultInput)).toBe(entry.defaultTarget)
      expect(searchedFor(slug)).toBe(entry.defaultTarget)
    }
  })

  it('searches a custom array for one of its own values', () => {
    expect(autoSearchTarget('linear-search', [14, 7, 22, 3, 19])).toBe(3)
    // Binary Search searches the sorted array, so "second to last" means of that.
    expect(autoSearchTarget('binary-search', [40, 10, 30, 20])).toBe(30)
    for (const slug of ['linear-search', 'binary-search']) {
      const values = [14, 7, 22, 3, 19]
      expect(values).toContain(searchedFor(slug, values))
    }
  })

  it('is the target the run uses, so the field\'s "Auto" placeholder tells the truth', () => {
    for (const slug of ['linear-search', 'binary-search']) {
      for (const values of [[5, 9, 2, 8], [1, 3, 5, 7, 9, 11]]) {
        expect(searchedFor(slug, values)).toBe(autoSearchTarget(slug, values))
      }
    }
  })
})

describe('a learner-chosen search target', () => {
  it('is the one searched for, including a value not in the array', () => {
    expect(searchedFor('linear-search', [4, 8, 15, 16], 15)).toBe(15)
    expect(searchedFor('binary-search', [4, 8, 15, 16], 99)).toBe(99)
  })

  it('builds the same Binary Search run as the default path, complexity question included', () => {
    const values = [1, 3, 5, 7, 9, 11, 15, 19]
    const viaRunFor = runFor('binary-search', values, { target: 3 })
    const direct = binarySearchEngine(values, 3, { withComplexityPrediction: complexityJunctionEnabled() })
    expect(viaRunFor.map((s) => s.criticalJunctionType ?? null)).toEqual(direct.map((s) => s.criticalJunctionType ?? null))
  })
})
