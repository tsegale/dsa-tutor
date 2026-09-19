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
    topic: {
      name: session.algorithmTopic.name,
      displayName: session.algorithmTopic.displayName,
      track: session.algorithmTopic.track,
      difficulty: session.algorithmTopic.difficulty,
    },
  }
}

export async function createSession(userId: string, dto: CreateSessionDto): Promise<SessionDto> {
  const session = await prisma.session.create({
    data: {
      userId,
      algorithmTopicId: dto.algorithmTopicId,
      mode: dto.mode,
      scaffoldingLevel: dto.scaffoldingLevel,
      startTime: new Date(),
    },
    include: { algorithmTopic: true },
  })
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
