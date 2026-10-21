import { describe, expect, it } from 'vitest'
import { PredictionType } from '@dsa-tutor/types'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { runFor } from '@/engine/runFor'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import { handsOnSelectionFor } from '@/utils/handsOnSelection'
import { correctTileIdFor } from '@/utils/correctTile'

/**
 * Hands-on by selection is graded by the same rule as the tiles.
 *
 * Both paths end at submitPrediction, which compares the submitted string
 * with correctTileIdFor(snapshot). A selection built from anything else
 * is a second answer key: the learner points at the right node and is
 * told they are wrong, and no test of either path alone would catch it,
 * because each is internally consistent.
 *
 * The invariant: the correct answer is always pointable, and there is
 * more than one thing to point at. The first draft of this file asked
 * instead that every choice be one of the tile grid's ids, and that was
 * the wrong question - the grid shows the answer plus two sampled
 * distractors, while the canvas offers every real candidate. It also hid
 * a real defect behind the noise: DFS's correct node is already marked
 * visited when the junction is asked, so filtering by "not visited"
 * dropped it and left a gesture that could only ever be wrong.
 */

const SLUGS = MODULES.flatMap((module) => module.topics)

interface Case {
  slug: string
  stepIndex: number
  junction: string
}

const CASES: Case[] = []
const seen = new Set<string>()

for (const slug of SLUGS) {
  const run = runFor(slug, getAlgorithmRegistryEntry(slug)?.defaultInput)
  for (const snapshot of run) {
    if (!handsOnSelectionFor(snapshot)) continue
    const key = `${slug}:${snapshot.criticalJunctionType}`
    if (seen.has(key)) continue
    seen.add(key)
    CASES.push({ slug, stepIndex: snapshot.stepIndex, junction: snapshot.criticalJunctionType ?? 'NONE' })
  }
}

function snapshotOf(entry: Case) {
  const run = runFor(entry.slug, getAlgorithmRegistryEntry(entry.slug)?.defaultInput)
  return run.find((candidate) => candidate.stepIndex === entry.stepIndex)!
}

describe('hands-on selection', () => {
  it('reaches a real set of topics', () => {
    // Guards against the loop above finding nothing, which would make
    // every case below pass vacuously. Three structural categories, more
    // than one topic each.
    expect(CASES.length).toBeGreaterThan(10)
    expect(new Set(CASES.map((entry) => entry.slug)).size).toBeGreaterThan(8)
    const kinds = new Set(CASES.map((entry) => handsOnSelectionFor(snapshotOf(entry))!.kind))
    expect([...kinds].sort()).toEqual(['graph', 'grid', 'tree'])
  })

  it.each(CASES.map((entry) => [`${entry.slug} / ${entry.junction}`, entry] as const))(
    '%s can express the right answer, and more than one answer',
    (_label, entry) => {
      const snapshot = snapshotOf(entry)
      const selection = handsOnSelectionFor(snapshot)!
      const answers = Object.values(selection.choices)

      expect(selection.hint.length).toBeGreaterThan(15)
      // A gesture with one option is a button that cannot be got wrong.
      expect(answers.length, `${entry.slug}: only one thing to point at`).toBeGreaterThan(1)

      const correct = correctTileIdFor(snapshot)
      expect(correct, `${entry.slug}: the grader has no answer for this junction`).not.toBeNull()
      expect(answers, `${entry.slug}: the right answer (${correct}) cannot be pointed at`).toContain(correct)
      // Exactly once: two things that both submit the right answer would
      // make the gesture ambiguous to the learner.
      expect(answers.filter((answer) => answer === correct)).toHaveLength(1)
    },
  )

  it.each(CASES.map((entry) => [`${entry.slug} / ${entry.junction}`, entry] as const))(
    '%s agrees with its tile grid on what is correct',
    (_label, entry) => {
      // The two paths may offer different NUMBERS of options, but they
      // must never disagree about which option is right.
      const snapshot = snapshotOf(entry)
      const tiles = getTilesForSnapshot(snapshot, getAlgorithmRegistryEntry(entry.slug)?.displayName ?? entry.slug)
      const markedCorrect = tiles.filter((tile) => tile.misconception === null).map((tile) => tile.id)
      if (markedCorrect.length === 0) return
      expect(markedCorrect).toEqual([correctTileIdFor(snapshot)])
    },
  )
})

describe('junctions with nothing to point at', () => {
  it('keep their tiles rather than inventing a gesture', () => {
    // A conceptual junction - "what is now guaranteed about the tree?" -
    // has nothing on the canvas that answers it. Hands-on mode leaves
    // those alone, which is why this returns null rather than something.
    const run = runFor('bubble-sort')
    const conceptual = run.find(
      (snapshot) => snapshot.isPredictionRequired && snapshot.criticalJunctionType === 'PASS_COMPLETE',
    )
    expect(conceptual).toBeDefined()
    expect(handsOnSelectionFor(conceptual!)).toBeNull()
  })

  it('is null for a step that is not a junction at all', () => {
    const run = runFor('bst')
    const watching = run.find((snapshot) => !snapshot.isPredictionRequired)!
    expect(handsOnSelectionFor(watching)).toBeNull()
    expect(handsOnSelectionFor(null)).toBeNull()
    expect(handsOnSelectionFor(undefined)).toBeNull()
  })

  it('never turns a code question into a pointing one', () => {
    // Code Mode rewrites a junction's predictionType; a learner in that
    // mode is writing the step, not pointing at it.
    const run = runFor('bst')
    for (const snapshot of run) {
      if (snapshot.predictionType !== PredictionType.CODE_EDITOR) continue
      expect(handsOnSelectionFor(snapshot)).toBeNull()
    }
  })
})
