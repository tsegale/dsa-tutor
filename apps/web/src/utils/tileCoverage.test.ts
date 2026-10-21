import { describe, expect, it } from 'vitest'
import { PredictionType } from '@dsa-tutor/types'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { runFor } from '@/engine/runFor'
import { getTilesForSnapshot } from '@/utils/tileBuilder'

/**
 * Every junction a run actually reaches must offer tiles to answer it.
 *
 * getTilesForSnapshot ends in `default: return []`, so a junction type
 * with no case produces a prediction zone with a question and nothing to
 * click. Nothing failed when the seven techniques topics were added -
 * every unit test passed, the build passed, the canvas drew correctly -
 * and Practice on all seven was a dead end. That is precisely the defect
 * a panel finds by clicking.
 *
 * Driven from real runs rather than from the junction-type enum: a type
 * declared in packages/types that no engine ever emits needs no tiles, and
 * demanding them would be busywork. What matters is what a student can
 * actually reach.
 */

const SLUGS = MODULES.flatMap((module) => module.topics)

interface Reached {
  slug: string
  junction: string
  stepIndex: number
}

const REACHED: Reached[] = []
const TILES_BY_JUNCTION = new Map<string, number>()

for (const slug of SLUGS) {
  const run = runFor(slug, getAlgorithmRegistryEntry(slug)?.defaultInput)
  for (const snapshot of run) {
    if (!snapshot.isPredictionRequired) continue
    if (snapshot.predictionType !== PredictionType.TILE_GRID) continue
    const junction = snapshot.criticalJunctionType ?? 'NONE'
    if (TILES_BY_JUNCTION.has(`${slug}:${junction}`)) continue
    TILES_BY_JUNCTION.set(`${slug}:${junction}`, snapshot.stepIndex)
    REACHED.push({ slug, junction, stepIndex: snapshot.stepIndex })
  }
}

describe('tile coverage, from real runs', () => {
  it('found junctions to check', () => {
    // Guards against the loop above silently finding nothing, which would
    // make every case below pass vacuously.
    expect(REACHED.length).toBeGreaterThan(60)
  })

  it.each(REACHED.map((entry) => [`${entry.slug} / ${entry.junction}`, entry] as const))(
    '%s offers tiles',
    (_label, entry) => {
      const run = runFor(entry.slug, getAlgorithmRegistryEntry(entry.slug)?.defaultInput)
      const snapshot = run.find((candidate) => candidate.stepIndex === entry.stepIndex)!
      const tiles = getTilesForSnapshot(snapshot, getAlgorithmRegistryEntry(entry.slug)?.displayName ?? entry.slug)

      expect(tiles.length, `${entry.slug} / ${entry.junction} has no tiles`).toBeGreaterThanOrEqual(2)
      for (const tile of tiles) {
        expect(tile.label.trim().length, `${entry.slug}: an empty tile label`).toBeGreaterThan(0)
      }
      // Exactly one right answer, or the grading is ambiguous.
      const correct = tiles.filter((tile) => tile.misconception === null)
      if (correct.length > 0) {
        expect(correct.length, `${entry.slug} / ${entry.junction} has ${correct.length} correct tiles`).toBe(1)
      }
      // Two tiles that read the same are a choice between identical
      // options, which is unanswerable however it is graded.
      const labels = tiles.map((tile) => tile.label)
      expect(new Set(labels).size, `${entry.slug} / ${entry.junction} repeats a tile label`).toBe(labels.length)
      const ids = tiles.map((tile) => tile.id)
      expect(new Set(ids).size, `${entry.slug} / ${entry.junction} repeats a tile id`).toBe(ids.length)
    },
  )
})
