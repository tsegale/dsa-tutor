import type { AlgorithmSnapshot, TopicMastery } from '@dsa-tutor/types'

/** A topic with nothing logged yet: what the api returns before any answer. */
export const EMPTY_MASTERY: TopicMastery = {
  status: 'NOT_STARTED',
  criteria: [
    { id: 'ACCURACY', applicable: true, met: false, value: null, threshold: 85, attempts: 0 },
    { id: 'BREADTH', applicable: true, met: false, value: 0, threshold: 3, attempts: 0 },
    { id: 'FEYNMAN', applicable: false, met: false, value: null, threshold: 80, attempts: 0 },
    { id: 'CHALLENGE', applicable: false, met: false, value: null, threshold: 1, attempts: 0 },
  ],
  hintsPerStep: null,
  masteredAt: null,
}

const hashCache = new WeakMap<readonly AlgorithmSnapshot[], string>()

/**
 * A short hash of a run's starting state (its first snapshot), logged on
 * each answer so the breadth criterion can count distinct inputs. It works
 * for every structure - array, search target, tree, graph - because it reads
 * the state, not an input format. FNV-1a, 32 bits: identifies inputs, not a
 * security hash. Cached per snapshot array, which is immutable.
 */
export function inputHashOf(snapshots: readonly AlgorithmSnapshot[]): string | null {
  if (snapshots.length === 0) return null
  const cached = hashCache.get(snapshots)
  if (cached) return cached
  const text = JSON.stringify(snapshots[0].dataStructureState) ?? ''
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  hashCache.set(snapshots, hex)
  return hex
}

/**
 * A challenge run is passed at this first-attempt accuracy on its junctions.
 * Mirrors MASTERY_RUBRIC.challengePassAccuracy (apps/api config/mastery.ts),
 * which mastery.test.ts there checks.
 */
export const CHALLENGE_PASS_ACCURACY = 85
