import { ScaffoldingLevel, type TopicDto } from '@dsa-tutor/types'
import { LEVEL_THRESHOLDS, SUPPORT_DESCRIPTION } from './masteryScore'

/** Home's mastery index: the mean mastery over unlocked topics. */
export function masteryIndex(topics: readonly TopicDto[]): number {
  const unlocked = topics.filter((topic) => !topic.isLocked)
  return unlocked.length ? Math.round(unlocked.reduce((sum, topic) => sum + topic.masteryPercent, 0) / unlocked.length) : 0
}

export interface SupportAssessment {
  level: ScaffoldingLevel
  /** 0 to 100. */
  score: number
  reasoning: string
}

/**
 * The learner's overall support band outside a session (Home, module pages,
 * Progress): the mastery index placed on calculateMastery's thresholds, with
 * reasoning in the same words. A session's live level can differ, because it
 * also weighs the current streak and recent hints.
 */
export function overallSupport(topics: readonly TopicDto[]): SupportAssessment {
  return supportFromIndex(masteryIndex(topics), topics.some((topic) => topic.masteryPercent > 0))
}

/** The overall band for a mastery index, when the index is already known (the profile's summary row). */
export function supportFromIndex(score: number, hasData: boolean): SupportAssessment {
  if (!hasData) {
    return { level: ScaffoldingLevel.HIGH, score: 0, reasoning: 'No interaction data yet. Starting with maximum support.' }
  }
  const level =
    score >= LEVEL_THRESHOLDS.NONE
      ? ScaffoldingLevel.NONE
      : score >= LEVEL_THRESHOLDS.LOW
        ? ScaffoldingLevel.LOW
        : score >= LEVEL_THRESHOLDS.MEDIUM
          ? ScaffoldingLevel.MEDIUM
          : ScaffoldingLevel.HIGH
  return { level, score, reasoning: `Score ${score}/100. ${SUPPORT_DESCRIPTION[level]}` }
}
