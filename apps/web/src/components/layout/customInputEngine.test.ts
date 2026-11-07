import { describe, expect, it } from 'vitest'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { CONTEXTUAL_CONTROL_SLUGS } from '@/components/layout/AlgorithmControls'
import { FIXED_INPUT_SLUGS } from '@/components/layout/LeftPanel'
import { runFor } from '@/engine/runFor'

/**
 * The left panel's generic "Custom array" box.
 *
 * Topics without contextual controls get this box, and its Apply and Random
 * buttons rebuild the run through runFor - the same function the page uses
 * on load, which is the point.
 *
 * There used to be two hand-written switches over the same 66 topics, one
 * per caller, and they drifted: the panel's had no case for Array Access,
 * Array Insertion or Array Deletion, so pressing Apply on any of them
 * replaced the canvas with a 34-step Bubble Sort run while the header still
 * said Array Access. These tests drive runFor itself rather than the
 * registry entry behind it, so they cover the code the button actually
 * runs.
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
    const snapshots = runFor(slug, CUSTOM)
    expect(snapshots.length).toBeGreaterThan(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it.each(GENERIC_BOX)('%s actually uses the custom input rather than a canned run', (slug) => {
    // The Bubble Sort fallback produced a run over whatever array it was
    // handed, so comparing against the default input is what catches an
    // engine replaying something else entirely.
    const fromCustom = runFor(slug, CUSTOM)
    const fromDefault = runFor(slug, [1, 2, 3, 4, 5, 6])
    expect(fromCustom).not.toEqual(fromDefault)
  })

  it.each(GENERIC_BOX)('%s produces its own run, not another topic\'s', (slug) => {
    // Every pair of topics on this box must differ for the same input. Two
    // that agree step for step means one is running the other's engine,
    // which is the exact shape of the bug this file exists for.
    const mine = JSON.stringify(runFor(slug, CUSTOM))
    const clashes = GENERIC_BOX.filter((other) => other !== slug && JSON.stringify(runFor(other, CUSTOM)) === mine)
    expect(clashes).toEqual([])
  })
})

/**
 * The merged switch, over every topic in the curriculum rather than only
 * the ones on the generic box.
 *
 * This is the guard the two-switch arrangement never had: a topic added to
 * the curriculum without a case here falls through to the default, and the
 * default is Bubble Sort. The page would look right - header, theory,
 * pseudocode and complexity all come from the topic's own config - and the
 * canvas would be sorting an array.
 */
describe('runFor, for every topic in the curriculum', () => {
  it.each(SLUGS)('%s builds a complete run', (slug) => {
    const snapshots = runFor(slug)
    expect(snapshots.length).toBeGreaterThan(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it.each(SLUGS.filter((slug) => slug !== 'bubble-sort'))('%s is not silently Bubble Sort', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)
    const bubble = JSON.stringify(runFor('bubble-sort', entry?.defaultInput))
    expect(JSON.stringify(runFor(slug))).not.toBe(bubble)
  })
})

describe('custom parameters for search, prefix-sum, floyd-warshall, topological-sort, and cycle-detection', () => {
  it('linear-search and binary-search produce distinct runs when a custom target (including missing target) is supplied', async () => {
    const { linearSearchEngine } = await import('@/engine/linearSearch')
    const { binarySearchEngine } = await import('@/engine/binarySearch')
    const arr = [2, 5, 8, 12, 16, 23]

    const linFirst = linearSearchEngine(arr, 2)
    const linMissing = linearSearchEngine(arr, 99)
    expect(linFirst.length).toBeLessThan(linMissing.length)
    expect(linFirst[linFirst.length - 1].description).toMatch(/2/)
    expect(linMissing[linMissing.length - 1].description).toMatch(/99/)

    const binFirst = binarySearchEngine(arr, 2)
    const binMissing = binarySearchEngine(arr, 99)
    expect(binFirst).not.toEqual(binMissing)
    expect(binMissing[binMissing.length - 1].description).toMatch(/99/)
  })

  it('prefix-sum accepts custom [from, to] range queries and reflects them in the final query snapshots', async () => {
    const { prefixSumEngine } = await import('@/engine/prefixSum')
    const arr = [3, 1, 4, 1, 5, 9]
    const defaultRun = prefixSumEngine(arr)
    const customRun = prefixSumEngine(arr, [
      { from: 0, to: 2 },
      { from: 2, to: 4 },
    ])
    expect(customRun).not.toEqual(defaultRun)
    expect(JSON.stringify(customRun)).toContain('p5 - p2 = 14 - 4 = 10')
  })

  it('floyd-warshall builds distinct matrix runs across different graph presets', async () => {
    const { floydWarshallEngine } = await import('@/engine/floydWarshall')
    const { MEDIUM_WEIGHTED } = await import('@/engine/graphPresets')
    const defaultRun = floydWarshallEngine(
      MEDIUM_WEIGHTED.nodes.slice(0, 5).map((n) => n.id),
      MEDIUM_WEIGHTED.adjacency,
    )
    const denseRun = floydWarshallEngine(['A', 'B', 'C', 'D'], {
      A: [
        { to: 'B', weight: 8 },
        { to: 'D', weight: 1 },
      ],
      B: [{ to: 'C', weight: 1 }],
      C: [{ to: 'A', weight: 4 }],
      D: [
        { to: 'B', weight: 2 },
        { to: 'C', weight: 9 },
      ],
    })
    expect(denseRun.length).toBeGreaterThan(0)
    expect(denseRun).not.toEqual(defaultRun)
  })

  it('cycle-detection and topological-sort support multiple graph presets via GRAPH_PRESETS', async () => {
    const { GRAPH_PRESETS } = await import('@/engine/graphPresets')
    const { cycleDetectionEngine, topologicalSortEngine } = await import('@/engine/graphProperties')

    expect(GRAPH_PRESETS['directed-acyclic']).toBeDefined()
    const cyclic = cycleDetectionEngine(
      GRAPH_PRESETS['directed-cycle'].nodes,
      GRAPH_PRESETS['directed-cycle'].adjacency as never,
      true,
    )
    const acyclic = cycleDetectionEngine(
      GRAPH_PRESETS['directed-acyclic'].nodes,
      GRAPH_PRESETS['directed-acyclic'].adjacency as never,
      true,
    )
    expect(cyclic).not.toEqual(acyclic)

    const topoDiamond = topologicalSortEngine(
      GRAPH_PRESETS['directed-acyclic'].nodes,
      GRAPH_PRESETS['directed-acyclic'].adjacency as never,
    )
    expect(topoDiamond.length).toBeGreaterThan(0)
  })
})
