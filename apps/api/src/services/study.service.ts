import { prisma } from '../lib/prisma'
import { STUDY_TOPICS } from '../config/studyTopics'
import type { StudyStatusDto } from '../dtos/study.dto'

const PRE_CODE = 'STUDY_PRE_V1'
const POST_CODE = 'STUDY_POST_V1'

export async function getStudyStatus(userId: string): Promise<StudyStatusDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { participantCode: true, consentAt: true, withdrawnAt: true },
  })
  if (!user?.participantCode) {
    return {
      isParticipant: false,
      withdrawn: false,
      consentRequired: false,
      pretestRequired: false,
      posttestAvailable: false,
      posttestCompleted: false,
    }
  }

  // Consent gates everything else - a participant who hasn't consented yet
  // has no business being told whether a post-test is available, since
  // they cannot reach a topic or assessment either way.
  if (!user.consentAt) {
    return {
      isParticipant: true,
      withdrawn: !!user.withdrawnAt,
      consentRequired: true,
      pretestRequired: true,
      posttestAvailable: false,
      posttestCompleted: false,
    }
  }

  const [preAttempt, postAttempt, completedTopics] = await Promise.all([
    prisma.assessmentAttempt.findFirst({
      where: { userId, assessment: { code: PRE_CODE }, completedAt: { not: null } },
    }),
    prisma.assessmentAttempt.findFirst({
      where: { userId, assessment: { code: POST_CODE }, completedAt: { not: null } },
    }),
    prisma.session.findMany({
      where: {
        userId,
        completed: true,
        algorithmTopic: { name: { in: [...STUDY_TOPICS] } },
      },
      select: { algorithmTopicId: true },
      distinct: ['algorithmTopicId'],
    }),
  ])

  return {
    isParticipant: true,
    withdrawn: !!user.withdrawnAt,
    consentRequired: false,
    pretestRequired: !preAttempt,
    posttestAvailable: completedTopics.length >= STUDY_TOPICS.length,
    posttestCompleted: !!postAttempt,
  }
}

/** Idempotent: consenting twice just keeps the original timestamp. */
export async function recordConsent(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { participantCode: true, consentAt: true } })
  if (!user?.participantCode) {
    throw new Error('NOT_A_PARTICIPANT')
  }
  if (user.consentAt) return

  await prisma.user.update({ where: { id: userId }, data: { consentAt: new Date() } })
}

/** Withdrawal excludes the participant from every research export (see
 * research.service.ts) but never touches their account, sessions, or
 * ability to keep using the platform - "withdraw" means "stop studying
 * me," not "delete my account." Idempotent for the same reason as consent. */
export async function withdrawParticipant(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { participantCode: true, withdrawnAt: true } })
  if (!user?.participantCode) {
    throw new Error('NOT_A_PARTICIPANT')
  }
  if (user.withdrawnAt) return

  await prisma.user.update({ where: { id: userId }, data: { withdrawnAt: new Date() } })
}

// Odd items (1-indexed) are worded positively, even items negatively -
// the standard System Usability Scale scoring rule. Deterministic
// arithmetic only, no LLM or statistics library involved.
export function computeSusScore(responses: number[]): number {
  if (responses.length !== 10 || responses.some((r) => !Number.isInteger(r) || r < 1 || r > 5)) {
    throw new Error('INVALID_SUS_RESPONSES')
  }

  const contributions = responses.map((response, index) => {
    const isOdd = index % 2 === 0 // index 0 = item 1
    return isOdd ? response - 1 : 5 - response
  })
  const rawTotal = contributions.reduce((sum, c) => sum + c, 0)
  return Math.round(rawTotal * 2.5)
}

/** One submission per participant, at the very end of the study - not per
 * session. Idempotent: resubmitting after an existing score is stored is
 * rejected rather than silently overwritten, since a changed answer this
 * late would be a different data point, not a correction of the same one. */
export async function submitSus(userId: string, responses: number[]): Promise<{ score: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { participantCode: true, susScore: true } })
  if (!user?.participantCode) {
    throw new Error('NOT_A_PARTICIPANT')
  }
  if (user.susScore !== null) {
    throw new Error('ALREADY_SUBMITTED')
  }

  const score = computeSusScore(responses)
  await prisma.user.update({
    where: { id: userId },
    data: { susResponses: responses, susScore: score, susSubmittedAt: new Date() },
  })
  return { score }
}
