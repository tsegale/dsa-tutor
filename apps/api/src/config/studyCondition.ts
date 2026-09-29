import { STUDY_TOPICS } from './studyTopics'

/**
 * Within-subject control (Week 3 3B). Each participant uses Classic (a plain
 * visualiser) on exactly one study topic and the full tutor on the other
 * two, so each is their own control with content held constant. Which topic
 * is Classic rotates with the participant code's ordinal:
 *
 *   1, 4, 7, 10  -> bubble-sort
 *   2, 5, 8, 11  -> binary-search
 *   3, 6, 9, 12  -> bst
 *
 * Topic order is fixed for everyone (bubble-sort, binary-search, bst); only
 * the Classic topic rotates. PILOT- codes follow the same rule, so pilots
 * exercise both paths. Set once at enrolment and never re-rolled.
 */
export function classicTopicFor(participantCode: string): string {
  const digits = participantCode.match(/(\d+)$/)?.[1]
  // Every issued code ends in a number; a code without one still gets a
  // stable topic (by character sum) rather than failing enrolment.
  const ordinal = digits ? Number(digits) : [...participantCode].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return STUDY_TOPICS[(((ordinal - 1) % STUDY_TOPICS.length) + STUDY_TOPICS.length) % STUDY_TOPICS.length]
}

export type StudyCondition = 'TUTOR' | 'CLASSIC'

/** The condition a participant is in for a topic. */
export function conditionFor(topicSlug: string, classicTopicSlug: string | null): StudyCondition {
  return classicTopicSlug !== null && topicSlug === classicTopicSlug ? 'CLASSIC' : 'TUTOR'
}
