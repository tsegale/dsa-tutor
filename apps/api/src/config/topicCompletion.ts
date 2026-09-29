/**
 * When a study participant has completed a topic - the rule that unlocks the
 * post-test. Decided 2026-09-29, before any real participant, and stated for
 * both study conditions now so the difference between them is a documented
 * decision rather than something found during analysis.
 *
 * TUTOR (the tutor with prediction junctions): the participant reached the
 * final step of a Practice run for the topic AND answered at least one
 * conceptual junction (PASS_COMPLETE, EARLY_TERMINATION, ALGORITHM_COMPLETE,
 * COMPLEXITY_PREDICTION) in that session. Reaching the last step alone is not
 * enough - Step forward can get there with no engagement. Conceptual
 * junctions fire at every scaffolding level and are never worked examples,
 * so every guided participant meets them whatever their level: the bar is
 * the same across scaffolding conditions.
 *
 * CLASSIC (the plain visualiser, config/studyCondition.ts): reaching the final step of
 * a run alone. Classic has no junctions to answer, so the guided rule cannot
 * apply - this asymmetry is deliberate, and the write-up must state it.
 *
 * Write-up: "participants were considered to have completed a topic when they
 * reached the end of a guided run and engaged with at least one conceptual
 * checkpoint" (classic: "reached the end of a run").
 *
 * The rule only gates the post-test and never hard-blocks it: a researcher can
 * override, which is recorded (User.posttestOverrideAt). Session.completed is
 * the session lifecycle (set on page close) and plays no part here.
 */
import type { StudyCondition } from './studyCondition'

/** A session's condition, from the mode the api recorded for it at creation. */
export function conditionOfSession(mode: string): StudyCondition {
  return mode === 'CLASSIC' ? 'CLASSIC' : 'TUTOR'
}

export interface TopicSessionSignals {
  reachedFinalStep: boolean
  conceptualJunctionsAnswered: number
}

export function isTopicComplete(signals: TopicSessionSignals, condition: StudyCondition): boolean {
  if (!signals.reachedFinalStep) return false
  return condition === 'CLASSIC' || signals.conceptualJunctionsAnswered >= 1
}
