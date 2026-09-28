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

/**
 * Self-explanation prompts (Week 2 2B): offered after a conceptual junction
 * answered correctly first time, at most this many per session, counting
 * skipped ones - each costs the learner time even when skipped.
 */
export const SELF_EXPLANATION_MAX_PER_SESSION = 3

/**
 * The COMPLEXITY_PREDICTION junction (Week 2 2C): one "how many comparisons
 * did this run make?" question after ALGORITHM_COMPLETE on each study run.
 */
export const COMPLEXITY_JUNCTION_ENABLED = true

/**
 * AI Challenges (Week 2 2D): at most this many per topic session. Each is a
 * full extra run, so it is the largest single addition to session length.
 */
export const CHALLENGES_PER_TOPIC = 2

/**
 * The tutor-time budget the study was planned around, across the three
 * study topics. Not enforced - the timing telemetry below reports against
 * it, and the pilot decides what to cut.
 */
export const STUDY_BUDGET_MINUTES = 30

/**
 * Timing telemetry (Week 2 2F): how often each topic session writes its
 * wall-clock and active (tab visible) seconds. It is also written whenever
 * the page is hidden, so a closed tab loses at most this much.
 */
export const TIMING_HEARTBEAT_MS = 60_000
