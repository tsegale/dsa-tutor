import { describe, expect, it } from 'vitest'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { CONTEXTUAL_CONTROL_SLUGS } from '@/components/layout/AlgorithmControls'
import { FIXED_INPUT_SLUGS } from '@/components/layout/LeftPanel'

/**
 * The left panel's generic "Custom array" box.
 *
 * Topics without contextual controls get this box, and its Apply and Random
 * buttons rebuild the run through LeftPanel's engineForSlug. That function
 * used to be a hand-written switch that fell through to Bubble Sort, and it
 * had drifted: Array Access, Array Insertion and Array Deletion had no case,
 * so pressing Apply on any of them replaced the canvas with a 34-step Bubble
 * Sort run while the header still said Array Access.
 *
 * engineForSlug now falls through to the registry entry for the open topic.
 * These tests guard the property that fix relies on: every topic that shows
 * the box has a registry entry whose engine really produces that topic's
 * run for an arbitrary input.
 */

const SLUGS = MODULES.flatMap((module) => module.topics)
const GENERIC_BOX = SLUGS.filter(
  (slug) => !CONTEXTUAL_CONTROL_SLUGS.has(slug) && !FIXED_INPUT_SLUGS.has(slug),
)

// Deliberately not any topic's default input: a drifted engine that ignores
// its argument and replays a canned run would pass against the default.
const CUSTOM = [9, 2, 7, 4]

describe('the generic custom-array box', () => {
  it('is shown on a real set of topics', () => {
    expect(GENERIC_BOX.length).toBeGreaterThan(5)
  })

  it('is not shown where the run is not built from an array', () => {
    // Floyd-Warshall operates on a fixed weighted graph through the MATRIX
    // canvas, so an array input there is a control that changes nothing.
    expect([...FIXED_INPUT_SLUGS]).toEqual(['floyd-warshall'])
    expect(GENERIC_BOX).not.toContain('floyd-warshall')
  })

  it.each(GENERIC_BOX)('%s has a registry entry for Apply to run', (slug) => {
    expect(getAlgorithmRegistryEntry(slug)).toBeDefined()
  })

  it.each(GENERIC_BOX)('%s builds a run from a custom input', (slug) => {
    const snapshots = getAlgorithmRegistryEntry(slug)!.engineFunction(CUSTOM)
    expect(snapshots.length).toBeGreaterThan(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it.each(GENERIC_BOX)('%s actually uses the custom input rather than a canned run', (slug) => {
    // The Bubble Sort fallback produced a run over whatever array it was
    // handed, so comparing against the default input is what catches an
    // engine replaying something else entirely.
    const fromCustom = getAlgorithmRegistryEntry(slug)!.engineFunction(CUSTOM)
    const fromDefault = getAlgorithmRegistryEntry(slug)!.engineFunction([1, 2, 3, 4, 5, 6])
    expect(fromCustom).not.toEqual(fromDefault)
  })

  it.each(GENERIC_BOX)('%s produces its own run, not another topic\'s', (slug) => {
    // Every pair of topics on this box must differ for the same input. Two
    // that agree step for step means one is running the other's engine,
    // which is the exact shape of the bug this file exists for.
    const mine = JSON.stringify(getAlgorithmRegistryEntry(slug)!.engineFunction(CUSTOM))
    const clashes = GENERIC_BOX.filter(
      (other) => other !== slug && JSON.stringify(getAlgorithmRegistryEntry(other)!.engineFunction(CUSTOM)) === mine,
    )
    expect(clashes).toEqual([])
  })
})
