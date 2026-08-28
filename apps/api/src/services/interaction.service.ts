import { prisma } from '../lib/prisma'
import type { CreateInteractionDto, InteractionDto } from '../dtos/interaction.dto'

export async function logInteraction(dto: CreateInteractionDto): Promise<InteractionDto> {
  const interaction = await prisma.interaction.create({
    data: {
      sessionId: dto.sessionId,
      stepIndex: dto.stepIndex,
      predictionSubmitted: dto.predictionSubmitted,
      predictionCorrect: dto.predictionCorrect,
      misconceptionCategory: dto.misconceptionCategory,
      hintsRequested: dto.hintsRequested,
      timeSpentSeconds: dto.timeSpentSeconds,
    },
  })
  return {
    id: interaction.id,
    sessionId: interaction.sessionId,
    stepIndex: interaction.stepIndex,
    predictionSubmitted: interaction.predictionSubmitted ?? '',
    predictionCorrect: interaction.predictionCorrect ?? false,
    misconceptionCategory: interaction.misconceptionCategory,
    hintsRequested: interaction.hintsRequested,
    timeSpentSeconds: interaction.timeSpentSeconds,
    createdAt: interaction.createdAt.toISOString(),
  }
}

export async function getSessionInteractions(sessionId: string): Promise<InteractionDto[]> {
  const interactions = await prisma.interaction.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  })
  return interactions.map((i) => ({
    id: i.id,
    sessionId: i.sessionId,
    stepIndex: i.stepIndex,
    predictionSubmitted: i.predictionSubmitted ?? '',
    predictionCorrect: i.predictionCorrect ?? false,
    misconceptionCategory: i.misconceptionCategory,
    hintsRequested: i.hintsRequested,
    timeSpentSeconds: i.timeSpentSeconds,
    createdAt: i.createdAt.toISOString(),
  }))
}
