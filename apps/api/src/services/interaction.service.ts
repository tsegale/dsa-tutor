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
      criticalJunctionType: dto.criticalJunctionType ?? null,
      junctionDifficulty: dto.junctionDifficulty ?? null,
      ...(dto.scaffoldingLevelAtTime && { scaffoldingLevelAtTime: dto.scaffoldingLevelAtTime }),
      ...(dto.masteryScoreAtTime !== undefined && { masteryScoreAtTime: dto.masteryScoreAtTime }),
      ...(dto.interactionType && { interactionType: dto.interactionType }),
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
    criticalJunctionType: interaction.criticalJunctionType,
    junctionDifficulty: interaction.junctionDifficulty,
    scaffoldingLevelAtTime: interaction.scaffoldingLevelAtTime,
    masteryScoreAtTime: interaction.masteryScoreAtTime,
    interactionType: interaction.interactionType,
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
    criticalJunctionType: i.criticalJunctionType,
    junctionDifficulty: i.junctionDifficulty,
    scaffoldingLevelAtTime: i.scaffoldingLevelAtTime,
    masteryScoreAtTime: i.masteryScoreAtTime,
    interactionType: i.interactionType,
    createdAt: i.createdAt.toISOString(),
  }))
}
