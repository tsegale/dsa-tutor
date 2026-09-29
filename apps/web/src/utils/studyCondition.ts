import { AlgorithmMode, type StudyStatusDto } from '@dsa-tutor/types'
import { COMPLEXITY_JUNCTION_ENABLED } from '@/config/pacing'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

/**
 * The study's within-subject control (Week 3 3B). Each participant uses
 * Classic - a plain step-through visualiser - on exactly one study topic,
 * assigned by the api at enrolment (User.classicTopicSlug), and the full
 * tutor on the other two. Non-participants always get the full app.
 *
 * Never label the conditions to participants: no "control", "classic",
 * "basic" or "full" in any copy they see. Both are just the platform.
 */
export function isClassicTopic(status: StudyStatusDto | undefined, topicSlug: string | undefined): boolean {
  return (
    !!status?.isParticipant &&
    !status.withdrawn &&
    !status.consentRequired &&
    !!topicSlug &&
    status.classicTopicSlug === topicSlug
  )
}

/**
 * What each condition shows. Classic keeps everything a conventional
 * visualiser has and removes every tutor affordance - no more, so it stays a
 * fair representative of the tools the study compares against.
 */
export interface ConditionFeatures {
  // Kept in both conditions
  stepControls: boolean
  autoPlay: boolean
  playbackSpeed: boolean
  customInput: boolean
  pseudocodeTab: boolean
  complexityTable: boolean
  progressMeter: boolean
  stepLog: boolean
  // Tutor only
  modeToggle: boolean
  scaffoldingPill: boolean
  aiTutorTab: boolean
  predictionZone: boolean
  hints: boolean
  workedSteps: boolean
  selfExplanation: boolean
  complexityPrediction: boolean
  measuredCounts: boolean
  aiChallenge: boolean
  feynman: boolean
  codeMode: boolean
  remediation: boolean
}

const KEPT = {
  stepControls: true,
  autoPlay: true,
  playbackSpeed: true,
  customInput: true,
  pseudocodeTab: true,
  complexityTable: true,
  progressMeter: true,
  stepLog: true,
} as const

export function conditionFeatures(classic: boolean): ConditionFeatures {
  const tutor = !classic
  return {
    ...KEPT,
    modeToggle: tutor,
    scaffoldingPill: tutor,
    aiTutorTab: tutor,
    predictionZone: tutor,
    hints: tutor,
    workedSteps: tutor,
    selfExplanation: tutor,
    complexityPrediction: tutor,
    measuredCounts: tutor,
    aiChallenge: tutor,
    feynman: tutor,
    codeMode: tutor,
    remediation: tutor,
  }
}

/** The page's starting mode. Classic ignores ?mode= entirely, so no link reaches a tutor mode. */
export function initialMode(modeParam: string | null, classic: boolean): AlgorithmMode {
  if (classic) return AlgorithmMode.DEMO
  return modeParam === 'DEMO' ? AlgorithmMode.DEMO : AlgorithmMode.PRACTICE
}

/** Whether runs built now get the complexity-prediction junction: never in Classic. */
export function complexityJunctionEnabled(): boolean {
  return COMPLEXITY_JUNCTION_ENABLED && !useAlgorithmStore.getState().classicMode
}

/**
 * The onboarding tour explains the tutor (Practice mode, AI Tutor, AI
 * Challenge), so it must run on a topic that has them. A participant whose
 * Classic topic is bubble-sort would otherwise be shown tutor features on a
 * page without them - confusing, and it would expose the conditions.
 */
export function tourTopicFor(classicTopicSlug: string | null): string {
  return classicTopicSlug === 'bubble-sort' ? 'binary-search' : 'bubble-sort'
}
