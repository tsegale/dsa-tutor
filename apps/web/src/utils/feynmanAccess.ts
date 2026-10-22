/**
 * Feynman mode's availability (Phase 8A). Unavailable only where the topic
 * has no reviewed rubric, and in Classic, where the mode is not shown at all
 * (Classic is the study's control condition, so this one is the experimental
 * manipulation, not a lock).
 *
 * It used to be LOCKED until a Practice run of the topic reached its final
 * step. That gate is gone: a student who wants to explain the algorithm back
 * before working through it may, and nothing in the app withholds a stage
 * it is able to offer.
 */
export type FeynmanAccessState = 'UNAVAILABLE' | 'AVAILABLE'

export interface FeynmanAccess {
  state: FeynmanAccessState
  /** Why the button cannot be used, for its tooltip. Null when available, or hidden (Classic). */
  reason: string | null
}

export const FEYNMAN_NO_RUBRIC_REASON = 'Feynman mode is not yet available for this topic.'

export function feynmanAccess({ classic, hasRubric }: { classic: boolean; hasRubric: boolean }): FeynmanAccess {
  if (classic) return { state: 'UNAVAILABLE', reason: null }
  if (!hasRubric) return { state: 'UNAVAILABLE', reason: FEYNMAN_NO_RUBRIC_REASON }
  return { state: 'AVAILABLE', reason: null }
}
