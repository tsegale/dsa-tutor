import type { StudyStatusDto } from '@dsa-tutor/types'
import { STUDY_TOPIC_SLUGS } from './misconceptionProbes'

export type StudyPhaseKey = 'consent' | 'pretest' | 'topics' | 'posttest' | 'complete'

export interface StudyPhase {
  key: StudyPhaseKey
  /** After "Study ·" in the header chip, e.g. "topic 2 of 3". */
  label: string
}

/**
 * Where a participant stands in the protocol, for the header's study chip
 * (Phase 4E). Null for anyone who is not an active participant: never
 * enrolled (the demo account included) or withdrawn.
 */
export function studyPhase(status: StudyStatusDto | null | undefined): StudyPhase | null {
  if (!status?.isParticipant || status.withdrawn) return null
  if (status.consentRequired) return { key: 'consent', label: 'consent due' }
  if (status.pretestRequired) return { key: 'pretest', label: 'pre-test due' }
  if (status.posttestCompleted) return { key: 'complete', label: 'complete' }
  if (status.posttestAvailable) return { key: 'posttest', label: 'post-test due' }
  const total = STUDY_TOPIC_SLUGS.length
  const current = Math.min(status.topicsCompleted.length + 1, total)
  return { key: 'topics', label: `topic ${current} of ${total}` }
}
