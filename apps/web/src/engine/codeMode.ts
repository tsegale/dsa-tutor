import { JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { codeStepFor } from '@/config/codeChallenges'
import { hasCodeLadder } from '@/config/codeLadders'

/**
 * Turns the junctions a topic's code challenge can grade into code
 * questions, and leaves every other junction alone.
 *
 * Code Mode used to be an option on a single engine: `bubbleSortEngine`
 * took `codeEditorMode` and set `PredictionType.CODE_EDITOR` itself on its
 * SWAP_DECISION junctions. No other engine took that option, so the Code
 * Mode toggle changed nothing on 65 of 66 topics - it looked like a
 * platform-wide feature in the UI and was one topic deep.
 *
 * Making it a pass over the finished snapshots instead means:
 *
 * - no engine knows about Code Mode, so none of them can forget to;
 * - a topic gets Code Mode by having a challenge written for it, in one
 *   file, and nothing else;
 * - a junction only becomes a code question when the challenge can
 *   actually grade it - `codeStepFor` returns null when the expected
 *   answer cannot be computed from the engine's own next snapshot, and
 *   then the junction stays a tile prediction rather than grading a
 *   student against nothing.
 *
 * The last point is the one that matters for the demo: there is no
 * authored answer key anywhere in Code Mode. The answer is the next
 * snapshot of the run the student is watching, so the question and the
 * canvas cannot disagree.
 *
 * A topic with a ladder (config/codeLadders.ts) takes its PROCEDURAL
 * junctions, because a rung is a question about the algorithm rather than
 * about one junction and its answer comes from the whole run. Without
 * that, a ladder on a topic with no single junction-anchored challenge -
 * stack and queue have none - would never be reachable at all.
 *
 * Only procedural ones. A conceptual junction asks what the run has
 * established ("what can we guarantee about the array now?") or how many
 * comparisons it made; neither has a line of code to write, and turning
 * them into editors would replace the questions that carry the reasoning
 * with an editor that has nothing to read back.
 */
export function withCodeMode(
  snapshots: AlgorithmSnapshot[],
  slug: string | undefined,
  enabled: boolean,
): AlgorithmSnapshot[] {
  if (!enabled) return snapshots
  let changed = false
  const ladder = hasCodeLadder(slug)
  const next = snapshots.map((snapshot, index) => {
    if (!snapshot.isPredictionRequired) return snapshot
    const ladderTakesIt = ladder && snapshot.junctionDifficulty === JunctionDifficulty.PROCEDURAL
    if (!ladderTakesIt && !codeStepFor(slug, snapshots, index)) return snapshot
    changed = true
    return { ...snapshot, predictionType: PredictionType.CODE_EDITOR }
  })
  // Same array back when nothing matched, so a topic without a challenge
  // is untouched rather than shallow-copied.
  return changed ? next : snapshots
}

/** Whether switching Code Mode on would change anything for this topic. */
export function codeModeChangesAnything(snapshots: AlgorithmSnapshot[], slug: string | undefined): boolean {
  return withCodeMode(snapshots, slug, true) !== snapshots
}
