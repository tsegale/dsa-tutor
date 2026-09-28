import { JunctionDifficulty, type AlgorithmSnapshot, type ScaffoldingLevel } from '@dsa-tutor/types'
import { PERFORM_ONE_IN } from '@/config/pacing'

/**
 * Worked-example fading (Week 2 2A). Engines still mark every candidate
 * junction with isPredictionRequired; this decides, at display time, which
 * procedural ones the learner performs and which run as narrated worked
 * steps. Snapshots stay pure and immutable - nothing here recomputes them.
 */

// Ordinal of each procedural junction within its run, cached per snapshot
// array (arrays are immutable, so identity is a safe cache key).
const ordinalCache = new WeakMap<readonly AlgorithmSnapshot[], Map<number, number>>()

function proceduralOrdinals(snapshots: readonly AlgorithmSnapshot[]): Map<number, number> {
  let ordinals = ordinalCache.get(snapshots)
  if (!ordinals) {
    ordinals = new Map()
    let next = 0
    snapshots.forEach((snapshot, index) => {
      if (snapshot.isPredictionRequired && snapshot.junctionDifficulty === JunctionDifficulty.PROCEDURAL) {
        ordinals!.set(index, next++)
      }
    })
    ordinalCache.set(snapshots, ordinals)
  }
  return ordinals
}

/**
 * True when the snapshot at `index` is a procedural junction that runs as a
 * worked step at this level. Deterministic - of every PERFORM_ONE_IN[level]
 * procedural junctions in a run the last is performed, so a run opens with
 * demonstrations and two participants at the same level see the same
 * sequence. Conceptual junctions are never worked.
 */
export function isWorkedStep(snapshots: readonly AlgorithmSnapshot[], index: number, level: ScaffoldingLevel): boolean {
  const ordinal = proceduralOrdinals(snapshots).get(index)
  if (ordinal === undefined) return false
  const every = PERFORM_ONE_IN[level]
  return every > 1 && ordinal % every !== every - 1
}

/**
 * True when leaving the snapshot at `index` ends a segment, so a changed
 * scaffolding level may take effect from the next step. A segment ends at a
 * conceptual junction - every Bubble Sort pass ends with one - so stepping
 * down mid-session changes the worked-to-performed ratio at the next pass
 * boundary, never mid-pass.
 */
export function endsSegment(snapshots: readonly AlgorithmSnapshot[], index: number): boolean {
  const snapshot = snapshots[index]
  return !!snapshot?.isPredictionRequired && snapshot.junctionDifficulty === JunctionDifficulty.CONCEPTUAL
}

/**
 * What a worked step shows: the observable step, then how the algorithm
 * resolves it - the next snapshot narrates the decision (e.g. "Since 5 > 3,
 * a swap is needed"). Safe to reveal: nothing is being asked.
 */
export function workedStepNarration(snapshots: readonly AlgorithmSnapshot[], index: number): string {
  const current = snapshots[index]?.description ?? ''
  const resolution = snapshots[index + 1]?.description ?? ''
  return resolution ? `${current} ${resolution}` : current
}
