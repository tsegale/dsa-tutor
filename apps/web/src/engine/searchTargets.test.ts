import { describe, expect, it } from 'vitest'
import { getAlgorithmRegistryEntry, searchTargetFor } from './registry'
import { extractSearchRange } from '@/utils/arrayOverlays'

/**
 * What a search demonstration actually demonstrates.
 *
 * Every search entry used to pass Math.random() * 20 + 1 as its target, so
 * Apply and Random hunted an arbitrary number usually absent from the
 * array: a failed search, different every press. Binary Search's default
 * target was worse still, sitting exactly on the first midpoint, so Module
 * 2's headline algorithm found its answer on probe one and demonstrated no
 * halving at all.
 */

const SEARCH_SLUGS = [
  'linear-search',
  'binary-search',
  'jump-search',
  'interpolation-search',
  'exponential-search',
] as const

describe('searchTargetFor', () => {
  it('picks a value that is in the array', () => {
    const input = [1, 3, 5, 7, 9]
    expect(input).toContain(searchTargetFor(input))
  })

  it('is deterministic', () => {
    const input = [1, 3, 5, 7, 9, 11, 15, 19]
    expect(searchTargetFor(input)).toBe(searchTargetFor(input))
  })

  it('degrades sensibly on a very short array', () => {
    expect(searchTargetFor([4])).toBe(4)
    expect(searchTargetFor([4, 8])).toBe(4)
    expect(searchTargetFor([])).toBe(0)
  })
})

describe('every search topic', () => {
  it.each(SEARCH_SLUGS)('%s declares a default target that is in its default input', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)!
    expect(entry.defaultTarget).toBeDefined()
    // The page loads the default run from defaultInput plus defaultTarget,
    // while Apply rebuilds it through engineFunction. A target absent from
    // the array would make the page demonstrate a failed search.
    expect(entry.defaultInput).toContain(entry.defaultTarget)
  })

  it.each(SEARCH_SLUGS)('%s builds the same run twice for the same input', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)!
    expect(entry.engineFunction(entry.defaultInput)).toEqual(entry.engineFunction(entry.defaultInput))
  })

  it.each(SEARCH_SLUGS)('%s finds what it is looking for', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)!
    const snaps = entry.engineFunction(entry.defaultInput)
    const final = snaps[snaps.length - 1]
    const state = final.dataStructureState as Record<string, unknown>
    expect(state.found, `${slug} did not find its target`).toBe(true)
  })
})

describe('binary search demonstrates halving', () => {
  it('needs more than one probe on its default run', () => {
    const entry = getAlgorithmRegistryEntry('binary-search')!
    const snaps = entry.engineFunction(entry.defaultInput)
    const probes = new Set(
      snaps
        .map((snapshot) => extractSearchRange(snapshot.dataStructureState, entry.defaultInput.length)?.probe)
        .filter((probe): probe is number => probe !== null && probe !== undefined),
    )
    expect(probes.size).toBeGreaterThan(1)
  })

  it('narrows its range at least twice, so the halving is visible', () => {
    const entry = getAlgorithmRegistryEntry('binary-search')!
    const length = entry.defaultInput.length
    const spans = entry
      .engineFunction(entry.defaultInput)
      .map((snapshot) => extractSearchRange(snapshot.dataStructureState, length))
      .filter((range) => range !== null)
      .map((range) => range!.high - range!.low + 1)
    const narrowings = spans.filter((span, index) => index > 0 && span < spans[index - 1]).length
    expect(narrowings).toBeGreaterThanOrEqual(2)
  })

  it('does the same on the run the page loads from defaultTarget', () => {
    // loadAlgorithmEngine builds the page's run from defaultInput and
    // defaultTarget rather than through engineFunction, so the two paths
    // have to agree about what a good demonstration is.
    const entry = getAlgorithmRegistryEntry('binary-search')!
    expect(entry.defaultTarget).toBe(searchTargetFor(entry.defaultInput))
  })
})
