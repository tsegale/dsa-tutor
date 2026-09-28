import { ScaffoldingLevel } from '@dsa-tutor/types'

/**
 * Every session-pacing knob for the study, in one place (Week 2 2F). The
 * pilot reports whether the ~30 minute budget holds; tune here, nowhere else.
 */

/**
 * Worked-example fading (Week 2 2A): of every N procedural junctions, the
 * learner performs one; the rest run as narrated worked steps. Conceptual
 * junctions are always performed at every level and are never worked.
 * This deliberately reverses Phase 6.2, which gave HIGH scaffolding the
 * most predictions: cognitive load theory has novices observe worked steps
 * and perform more of them independently as mastery rises.
 */
export const PERFORM_ONE_IN: Record<ScaffoldingLevel, number> = {
  [ScaffoldingLevel.HIGH]: 4, // ~25% performed
  [ScaffoldingLevel.MEDIUM]: 2, // alternate steps worked
  [ScaffoldingLevel.LOW]: 1, // all performed
  [ScaffoldingLevel.NONE]: 1, // all performed, no elaborated feedback
}

/** How long a worked step's narration stays up before the run moves on. */
export const WORKED_STEP_DWELL_MS = 4500
