import { checkStaleEventsOnSessionStart } from './misconceptionEvent.service'
import { conditionFor } from '../config/studyCondition'
import { isActiveParticipant } from './study.service'
import { prisma } from '../lib/prisma'
import type { CreateSessionDto, UpdateSessionDto, SessionDto } from '../dtos/session.dto'

function toSessionDto(session: any): SessionDto {
  return {
    id: session.id,
    userId: session.userId,
    algorithmTopicId: session.algorithmTopicId,
    mode: session.mode,
    scaffoldingLevel: session.scaffoldingLevel,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    completed: session.completed,
    challengeExplanation: session.challengeExplanation ?? null,
    wallClockSeconds: session.wallClockSeconds ?? null,
    activeSeconds: session.activeSeconds ?? null,
    topic: {
      name: session.algorithmTopic.name,
      displayName: session.algorithmTopic.displayName,
      track: session.algorithmTopic.track,
      difficulty: session.algorithmTopic.difficulty,
    },
  }
}

/**
 * The mode a session is recorded with. The server decides the study
 * condition, not the browser: an active participant's Classic topic is
 * always CLASSIC, and CLASSIC is never recorded anywhere else - so a
 * session's mode is a trustworthy condition label for the analysis.
 */
export function recordedSessionMode(
  requested: CreateSessionDto['mode'],
  topicName: string,
  participant: { classicTopicSlug: string | null; active: boolean },
): CreateSessionDto['mode'] {
  if (participant.active && conditionFor(topicName, participant.classicTopicSlug) === 'CLASSIC') return 'CLASSIC'
  return requested === 'CLASSIC' ? 'PRACTICE' : requested
}

export async function createSession(userId: string, dto: CreateSessionDto): Promise<SessionDto> {
  const [user, topic] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { participantCode: true, consentAt: true, withdrawnAt: true, classicTopicSlug: true },
    }),
    prisma.algorithmTopic.findUnique({ where: { id: dto.algorithmTopicId }, select: { name: true } }),
  ])
  const mode = recordedSessionMode(dto.mode, topic?.name ?? '', {
    classicTopicSlug: user?.classicTopicSlug ?? null,
    active: !!user && isActiveParticipant(user),
  })
  const session = await prisma.session.create({
    data: {
      userId,
      algorithmTopicId: dto.algorithmTopicId,
      mode,
      scaffoldingLevel: dto.scaffoldingLevel,
      startTime: new Date(),
    },
    include: { algorithmTopic: true },
  })
  // Any session start may abandon events left on other topics (3C.3). Done
  // here, not by the client, so Classic and non-study sessions count too.
  // Best-effort: a failure here must never stop the session starting.
  await checkStaleEventsOnSessionStart(userId, dto.algorithmTopicId).catch(() => undefined)
  return toSessionDto(session)
}

export async function updateSession(
  sessionId: string,
  userId: string,
  dto: UpdateSessionDto,
): Promise<SessionDto> {
  const session = await prisma.session.update({
    where: { id: sessionId, userId },
    data: {
      ...(dto.endTime && { endTime: new Date(dto.endTime) }),
      ...(dto.completed !== undefined && { completed: dto.completed }),
      ...(dto.scaffoldingLevel && { scaffoldingLevel: dto.scaffoldingLevel }),
      ...(dto.challengeExplanation !== undefined && { challengeExplanation: dto.challengeExplanation }),
      ...(dto.mentalEffort !== undefined && { mentalEffort: dto.mentalEffort }),
      ...(dto.confidence !== undefined && { confidence: dto.confidence }),
      ...(dto.reachedFinalStep && { reachedFinalStep: true }),
      ...(dto.wallClockSeconds !== undefined && { wallClockSeconds: dto.wallClockSeconds }),
      ...(dto.activeSeconds !== undefined && { activeSeconds: dto.activeSeconds }),
    },
    include: { algorithmTopic: true },
  })

  // Written at session end only, and only when the caller actually sent a
  // mastery snapshot to write - completing a session with no predictions
  // (e.g. immediately navigating away) must not overwrite a real prior
  // TopicMastery row with zeros.
  if (dto.completed && dto.overallScore !== undefined && dto.totalPredictions) {
    await prisma.topicMastery.upsert({
      where: { userId_algorithmTopicId: { userId, algorithmTopicId: session.algorithmTopicId } },
      update: {
        overallScore: dto.overallScore,
        conceptualScore: dto.conceptualScore ?? 0,
        proceduralScore: dto.proceduralScore ?? 0,
        totalPredictions: dto.totalPredictions,
        correctPredictions: dto.correctPredictions ?? 0,
        lastPracticedAt: new Date(),
      },
      create: {
        userId,
        algorithmTopicId: session.algorithmTopicId,
        overallScore: dto.overallScore,
        conceptualScore: dto.conceptualScore ?? 0,
        proceduralScore: dto.proceduralScore ?? 0,
        totalPredictions: dto.totalPredictions,
        correctPredictions: dto.correctPredictions ?? 0,
        lastPracticedAt: new Date(),
      },
    })
  }

  return toSessionDto(session)
}

export async function getSession(sessionId: string, userId: string): Promise<SessionDto> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId, userId },
    include: { algorithmTopic: true },
  })
  return toSessionDto(session)
}

export async function getLatestSession(
  userId: string,
  completed?: boolean,
): Promise<SessionDto | null> {
  const session = await prisma.session.findFirst({
    where: { userId, ...(completed !== undefined && { completed }) },
    orderBy: { startTime: 'desc' },
    include: { algorithmTopic: true },
  })
  return session ? toSessionDto(session) : null
}
