import { describe, expect, it } from 'vitest'
import { CriticalJunctionType } from '@dsa-tutor/types'
import { MODULES } from '@/config/curriculum'
import { HANDS_ON_ACTIVE, HANDS_ON_COMING_SOON, BUTTONS_ARE_HANDS_ON, NO_HANDS_ON } from '@/config/pipeline'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { runFor } from '@/engine/runFor'
import { handsOnSelectionFor } from '@/utils/handsOnSelection'

/**
 * What Hands-on offers, checked against what the canvases can actually do.
 *
 * The four category sets in pipeline.ts are a claim about every topic -
 * this one has a gesture, this one never will, this one is not built yet -
 * and a claim kept by hand goes stale the moment a canvas gains something.
 * It had: the four tree traversals said "the drag interaction for this
 * topic is not built yet" while every node on their canvas was a thing
 * you could point at, and ten more said their buttons were the hands-on
 * work.
 *
 * Two gestures count. A drag, which the array canvases implement for the
 * sorting junctions, and a selection, which handsOnSelectionFor declares
 * for the tree, graph and grid canvases. The grid pathfinders also let a
 * learner draw walls, which is a gesture on the canvas but not an answer
 * to a junction, so they are listed separately below.
 */

const SLUGS = MODULES.flatMap((module) => module.topics)

/** The junctions ArrayCanvas implements a drag for. */
const DRAG_JUNCTIONS = new Set<CriticalJunctionType>([
  CriticalJunctionType.SWAP_DECISION,
  CriticalJunctionType.NEW_MINIMUM,
  CriticalJunctionType.PARTITION_DECISION,
  CriticalJunctionType.MERGE_DECISION,
  CriticalJunctionType.GAP_COMPARISON,
  CriticalJunctionType.HEAP_COMPARE,
])

/** Walls are drawn directly on these canvases: a gesture, but not an
 * answer to a junction, so it is named rather than derived. */
const DRAWS_ON_CANVAS = new Set(['grid-bfs', 'grid-dfs', 'grid-dijkstra', 'grid-astar'])

function gesturesOf(slug: string): { drag: number; select: number } {
  const run = runFor(slug, getAlgorithmRegistryEntry(slug)?.defaultInput)
  let drag = 0
  let select = 0
  for (const snapshot of run) {
    if (!snapshot.isPredictionRequired) continue
    if (snapshot.criticalJunctionType && DRAG_JUNCTIONS.has(snapshot.criticalJunctionType)) drag += 1
    if (handsOnSelectionFor(snapshot)) select += 1
  }
  return { drag, select }
}

const GESTURES = new Map(SLUGS.map((slug) => [slug, gesturesOf(slug)]))

describe('hands-on coverage', () => {
  it('found gestures to check', () => {
    const withAny = SLUGS.filter((slug) => {
      const { drag, select } = GESTURES.get(slug)!
      return drag > 0 || select > 0
    })
    // Guards against the derivation silently finding nothing.
    expect(withAny.length).toBeGreaterThan(20)
  })

  it.each(SLUGS)('%s is in exactly one category', (slug) => {
    const inSets = [NO_HANDS_ON, BUTTONS_ARE_HANDS_ON, HANDS_ON_COMING_SOON, HANDS_ON_ACTIVE].filter((set) =>
      set.has(slug),
    )
    expect(inSets).toHaveLength(1)
  })

  it.each(SLUGS)('%s is listed as active only if it has a gesture', (slug) => {
    if (!HANDS_ON_ACTIVE.has(slug)) return
    const { drag, select } = GESTURES.get(slug)!
    expect(
      drag > 0 || select > 0 || DRAWS_ON_CANVAS.has(slug),
      `${slug} is offered as Hands-on but its canvas has nothing to do`,
    ).toBe(true)
  })

  it.each(SLUGS)('%s is listed as active if it does have a gesture', (slug) => {
    const { drag, select } = GESTURES.get(slug)!
    if (drag === 0 && select === 0) return
    // The reverse direction, which is the one that goes stale: a canvas
    // gains a gesture and the category set is never revisited, so the
    // stage stays hidden behind "not built yet".
    expect(HANDS_ON_ACTIVE.has(slug), `${slug} has a gesture but Hands-on is not offered for it`).toBe(true)
  })
})
