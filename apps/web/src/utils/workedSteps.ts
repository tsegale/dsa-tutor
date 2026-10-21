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

// The first index at which each conceptual junction type is asked, cached
// per snapshot array like the procedural ordinals above.
const conceptualFirstCache = new WeakMap<readonly AlgorithmSnapshot[], Map<string, number>>()

function conceptualFirsts(snapshots: readonly AlgorithmSnapshot[]): Map<string, number> {
  let firsts = conceptualFirstCache.get(snapshots)
  if (!firsts) {
    firsts = new Map()
    snapshots.forEach((snapshot, index) => {
      const type = snapshot.criticalJunctionType
      if (!snapshot.isPredictionRequired || !type) return
      if (snapshot.junctionDifficulty !== JunctionDifficulty.CONCEPTUAL) return
      if (!firsts!.has(type)) firsts!.set(type, index)
    })
    conceptualFirstCache.set(snapshots, firsts)
  }
  return firsts
}

/**
 * True when the snapshot at `index` runs as a narrated worked step rather
 * than something the learner performs.
 *
 * Procedural junctions fade by level: of every PERFORM_ONE_IN[level] in a
 * run the last is performed, so a run opens with demonstrations and two
 * participants at the same level see the same sequence.
 *
 * A conceptual junction is asked the FIRST time its type comes up and
 * narrated after that. Its question is about the invariant rather than
 * the values, so every later one repeats it word for word - Bubble Sort
 * asked "what can we guarantee about the array?" once per pass, three
 * times on five elements and once more for every element added. Answering
 * it a fourth time demonstrates nothing the first did not.
 *
 * Junction types in `focus` (a focused re-run on what the learner missed,
 * Phase 7E) are always performed, never worked.
 */
export function isWorkedStep(
  snapshots: readonly AlgorithmSnapshot[],
  index: number,
  level: ScaffoldingLevel,
  focus: readonly string[] = [],
): boolean {
  const type = snapshots[index]?.criticalJunctionType
  if (type && focus.includes(type)) return false

  const firstAsked = type ? conceptualFirsts(snapshots).get(type) : undefined
  if (firstAsked !== undefined) return index !== firstAsked

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
