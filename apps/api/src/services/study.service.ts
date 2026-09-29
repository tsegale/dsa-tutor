import { timingSafeEqual } from 'crypto'
import { prisma } from '../lib/prisma'
import { STUDY_TOPICS } from '../config/studyTopics'
import type { StudyStatusDto } from '../dtos/study.dto'
import { consentDetailsComplete } from '../config/studyConsent'
import { SCORED_INTERACTION_TYPES } from '../config/interactionTypes'
import { conditionOfSession, isTopicComplete } from '../config/topicCompletion'
import { classicTopicFor } from '../config/studyCondition'

const PRE_CODE = 'STUDY_PRE_V1'
const POST_CODE = 'STUDY_POST_V1'

type ParticipantFields = {
  participantCode: string | null
  consentAt: Date | null
  withdrawnAt: Date | null
}

/** The one definition of "currently an active study participant" - used
 * everywhere that decision matters (topic restriction, research export
 * inclusion, study status) instead of each call site re-deriving its own
 * ad-hoc check. A participant who withdrew is excluded even though
 * participantCode is never cleared - see withdrawParticipant's own
 * comment on why (remediation doc 12D.2). */
export function isActiveParticipant(user: ParticipantFields): boolean {
  return !!user.participantCode && !!user.consentAt && user.withdrawnAt === null
}

/** Prisma where-clause form of isActiveParticipant, for querying the User
 * model directly or through a relation (e.g. `session: { user:
 * ACTIVE_PARTICIPANT_WHERE }`) rather than fetching rows just to filter
 * them in memory. */
export const ACTIVE_PARTICIPANT_WHERE = {
  participantCode: { not: null as string | null },
  consentAt: { not: null as Date | null },
  withdrawnAt: null as Date | null,
}

/**
 * The study topics this participant has completed under the topic-completion
 * rule (config/topicCompletion.ts), counting only sessions started after
 * consent. Signals: Session.reachedFinalStep, and the graded conceptual
 * answers stored in that session's Interaction rows.
 */
export async function completedStudyTopics(userId: string, consentAt: Date): Promise<string[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      algorithmTopic: { name: { in: [...STUDY_TOPICS] } },
      startTime: { gte: consentAt },
      reachedFinalStep: true,
    },
    select: {
      reachedFinalStep: true,
      mode: true,
      algorithmTopic: { select: { name: true } },
      _count: {
        select: {
          interactions: {
            where: {
              junctionDifficulty: 'CONCEPTUAL',
              interactionType: { in: [...SCORED_INTERACTION_TYPES] },
              predictionSubmitted: { not: null },
            },
          },
        },
      },
    },
  })
  const completed = new Set<string>()
  for (const session of sessions) {
    const signals = { reachedFinalStep: session.reachedFinalStep, conceptualJunctionsAnswered: session._count.interactions }
    // Each session is judged by its own condition: Classic sessions need
    // only the final step (they have no junctions).
    if (isTopicComplete(signals, conditionOfSession(session.mode))) completed.add(session.algorithmTopic.name)
  }
  return STUDY_TOPICS.filter((topic) => completed.has(topic))
}

export async function getStudyStatus(userId: string): Promise<StudyStatusDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { participantCode: true, consentAt: true, withdrawnAt: true, posttestOverrideAt: true, classicTopicSlug: true },
  })
  if (!user?.participantCode) {
    return {
      isParticipant: false,
      withdrawn: false,
      consentRequired: false,
      pretestRequired: false,
      posttestAvailable: false,
      posttestCompleted: false,
      topicsCompleted: [],
      posttestOverride: false,
      classicTopicSlug: null,
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
      topicsCompleted: [],
      posttestOverride: false,
      classicTopicSlug: null,
    }
  }

  const consentAt = user.consentAt
  const [preAttempt, postAttempt, topicsCompleted] = await Promise.all([
    prisma.assessmentAttempt.findFirst({
      where: { userId, assessment: { code: PRE_CODE }, completedAt: { not: null } },
    }),
    prisma.assessmentAttempt.findFirst({
      where: { userId, assessment: { code: POST_CODE }, completedAt: { not: null } },
    }),
    completedStudyTopics(userId, consentAt),
  ])

  return {
    isParticipant: true,
    // participantCode and consentAt are both already known truthy at this
    // point, so isActiveParticipant here differs from withdrawnAt alone
    // only in name, not in value - using it keeps this branch expressed
    // in terms of the one shared definition instead of a fourth ad-hoc
    // !!withdrawnAt check.
    withdrawn: !isActiveParticipant(user),
    consentRequired: false,
    pretestRequired: !preAttempt,
    // The completion rule gates the post-test, but never hard-blocks it: a
    // researcher override (recorded) opens it too.
    posttestAvailable: topicsCompleted.length >= STUDY_TOPICS.length || user.posttestOverrideAt !== null,
    posttestCompleted: !!postAttempt,
    topicsCompleted,
    posttestOverride: user.posttestOverrideAt !== null,
    classicTopicSlug: user.classicTopicSlug,
  }
}

/** A code as the participant typed it, normalised to how it's matched and
 * stored - trimmed and uppercased, so "p01" and "P01" are the same claim. */
export function normalizeParticipantCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/** Pilot codes (PILOT-1, ...) are excluded from research exports by default. */
export function isPilotCode(code: string): boolean {
  return normalizeParticipantCode(code).startsWith('PILOT-')
}

/** Parses the comma-separated allowlist of codes a researcher has actually
 * issued to participants, e.g. "P01,P02,PILOT-1,PILOT-2". Never generated
 * or derived here - these are handed out outside the app and only checked
 * against here. */
export function parseEnrolmentAllowlist(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((code) => normalizeParticipantCode(code))
      .filter((code) => code.length > 0),
  )
}

/** Claims a researcher-issued code as this user's participantCode. The
 * unique index on participantCode is what actually prevents a second
 * person claiming an already-claimed code; this checks first only to
 * return a clean 409 instead of a raw constraint-violation 500. */
export async function enrolParticipant(userId: string, rawCode: string): Promise<StudyStatusDto> {
  const code = normalizeParticipantCode(rawCode)
  if (!code || !parseEnrolmentAllowlist(process.env.STUDY_ENROLMENT_CODES ?? '').has(code)) {
    throw new Error('INVALID_CODE')
  }
  // No real participant is enrolled against a consent page with placeholders
  // on it (no researcher email, no ethics approval line). Pilot codes are
  // allowed, so the flow can be tested before the page is final.
  if (!isPilotCode(code) && !consentDetailsComplete()) {
    throw new Error('ENROLMENT_NOT_OPEN')
  }

  const [self, claimedBy] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { participantCode: true } }),
    prisma.user.findUnique({ where: { participantCode: code }, select: { id: true } }),
  ])
  if (self?.participantCode) {
    throw new Error('ALREADY_ENROLLED')
  }
  if (claimedBy) {
    throw new Error('CODE_TAKEN')
  }

  // The Classic topic is fixed here, once, and never re-rolled.
  await prisma.user.update({ where: { id: userId }, data: { participantCode: code, classicTopicSlug: classicTopicFor(code) } })
  return getStudyStatus(userId)
}

/**
 * Lets a participant who has not met the topic-completion rule take the
 * post-test, when the researcher running the session confirms it with the
 * researcher PIN (STUDY_RESEARCHER_PIN). In a one-shot lab session a
 * participant stuck on a definitional edge case would otherwise be lost
 * data. Records when, and which topics were still incomplete. Idempotent.
 */
export async function overridePosttest(userId: string, pin: string): Promise<StudyStatusDto> {
  const expected = process.env.STUDY_RESEARCHER_PIN ?? ''
  if (!expected.trim()) throw new Error('OVERRIDE_NOT_CONFIGURED')
  if (!pinMatches(pin, expected)) throw new Error('WRONG_PIN')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { participantCode: true, consentAt: true, withdrawnAt: true, posttestOverrideAt: true },
  })
  if (!user?.participantCode || !user.consentAt || user.withdrawnAt) throw new Error('NOT_A_PARTICIPANT')
  if (!user.posttestOverrideAt) {
    const completed = await completedStudyTopics(userId, user.consentAt)
    await prisma.user.update({
      where: { id: userId },
      data: {
        posttestOverrideAt: new Date(),
        posttestOverrideIncompleteTopics: STUDY_TOPICS.filter((topic) => !completed.includes(topic)),
      },
    })
  }
  return getStudyStatus(userId)
}

/** Constant-time comparison, so response timing says nothing about the PIN. */
function pinMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given.trim())
  const b = Buffer.from(expected.trim())
  return a.length === b.length && timingSafeEqual(a, b)
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
