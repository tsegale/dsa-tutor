import { describe, expect, it } from 'vitest'
import { AlgorithmMode, JunctionDifficulty } from '@dsa-tutor/types'
import { MODULES } from '@/config/curriculum'
import { runFor } from '@/engine/runFor'
import { getHandsOnDragTarget, handsOnStayAnswer } from './handsOnDrag'
import { getTilesForSnapshot } from './tileBuilder'
import { correctTileIdFor } from './correctTile'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

describe('threshold drags can express both answers', () => {
  const slugs = MODULES.flatMap((m) => m.topics)

  it('offers a labelled control for the answer that is not a drag', () => {
    // The drag only expresses "move it past the other one". The other
    // answer was reachable only by picking a bar up and putting it back,
    // which nothing on screen said - so on an already-ordered pair the
    // learner saw a question with no visible way to answer it.
    let checked = 0
    for (const slug of slugs) {
      useAlgorithmStore.setState({ mode: AlgorithmMode.HANDS_ON })
      for (const snapshot of runFor(slug)) {
        const target = getHandsOnDragTarget(snapshot)
        if (!target || target.kind !== 'threshold') continue
        const stay = handsOnStayAnswer(snapshot)
        expect(stay, `${slug} stay answer`).toBe(target.answerB)
        // It must have a tile, because that tile's label is the control's
        // wording - hands-on and practice then say the same thing.
        const tiles = getTilesForSnapshot(snapshot, slug)
        const tile = tiles.find((t) => t.id === stay)
        expect(tile?.label, `${slug} label for ${stay}`).toBeTruthy()
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('can reach the correct answer either way round', () => {
    // Whichever of the two answers is right at a given junction, one of
    // the two affordances produces it.
    for (const slug of slugs) {
      for (const snapshot of runFor(slug)) {
        const target = getHandsOnDragTarget(snapshot)
        if (!target || target.kind !== 'threshold') continue
        const correct = correctTileIdFor(snapshot)
        if (correct === null) continue
        expect([target.answerA, target.answerB], `${slug} ${snapshot.criticalJunctionType}`).toContain(correct)
      }
    }
  })

  it('never offers a drag on a purely conceptual junction', () => {
    for (const slug of slugs) {
      for (const snapshot of runFor(slug)) {
        if (snapshot.junctionDifficulty !== JunctionDifficulty.CONCEPTUAL) continue
        expect(getHandsOnDragTarget(snapshot), `${slug} ${snapshot.criticalJunctionType}`).toBeNull()
      }
    }
  })
})
