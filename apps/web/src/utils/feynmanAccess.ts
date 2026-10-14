/**
 * Feynman mode's lifecycle (Phase 8A). Unavailable where the topic has no
 * reviewed rubric (and always in Classic, where it is not shown); locked
 * until a Practice run of the topic reaches its final step; then available
 * on demand for good. Demo runs never unlock it: they are watched, not done.
 */
export type FeynmanAccessState = 'UNAVAILABLE' | 'LOCKED' | 'AVAILABLE'

export interface FeynmanAccess {
  state: FeynmanAccessState
  /** Why the button cannot be used, for its tooltip. Null when available, or hidden (Classic). */
  reason: string | null
}

export const FEYNMAN_LOCKED_REASON = 'Complete a practice run to unlock.'
export const FEYNMAN_NO_RUBRIC_REASON = 'Feynman mode is not yet available for this topic.'

export function feynmanAccess({ classic, hasRubric, runCompleted }: { classic: boolean; hasRubric: boolean; runCompleted: boolean }): FeynmanAccess {
  if (classic) return { state: 'UNAVAILABLE', reason: null }
  if (!hasRubric) return { state: 'UNAVAILABLE', reason: FEYNMAN_NO_RUBRIC_REASON }
  if (!runCompleted) return { state: 'LOCKED', reason: FEYNMAN_LOCKED_REASON }
  return { state: 'AVAILABLE', reason: null }
}
