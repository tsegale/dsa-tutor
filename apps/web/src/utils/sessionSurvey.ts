import { STUDY_TOPIC_SLUGS } from './misconceptionProbes'

/**
 * Whether leaving a topic should ask the "Before you go" questions
 * (Paas mental effort, confidence).
 *
 * Only for an active study participant leaving a study topic. Those
 * answers are read by exactly one thing, the research sessions export,
 * and it keeps only active participants' sessions on the study topics
 * (research.service.ts, exportSessionsCsv). Anyone else was asked on every
 * exit - including moving to the next topic in the curriculum list a few
 * seconds into a Demo - for answers nothing would ever read.
 *
 * A participant is still asked on every exit from a study topic, exactly
 * as before: that is the study's protocol, and this does not change it.
 */
export function shouldAskSessionSurvey({
  hasSession,
  activeParticipant,
  topicSlug,
}: {
  hasSession: boolean
  activeParticipant: boolean
  topicSlug: string | null | undefined
}): boolean {
  if (!hasSession || !activeParticipant || !topicSlug) return false
  return (STUDY_TOPIC_SLUGS as readonly string[]).includes(topicSlug)
}
