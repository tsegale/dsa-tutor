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
      aiGenerated: dto.aiGenerated ?? false,
      feedbackText: dto.feedbackText ?? null,
      hintText: dto.hintText ?? null,
      counterfactualText: dto.counterfactualText ?? null,
      aiMisconceptionCategory: dto.aiMisconceptionCategory ?? null,
      bottomedOut: dto.bottomedOut ?? false,
      hintIndexAtResolve: dto.hintIndexAtResolve ?? 0,
      aiLatencyMs: dto.aiLatencyMs ?? null,
      aiModel: dto.aiModel ?? null,
      promptVersion: dto.promptVersion ?? null,
    },
  })
  return toInteractionDto(interaction)
}

function toInteractionDto(interaction: {
  id: string
  sessionId: string
  stepIndex: number
  predictionSubmitted: string | null
  predictionCorrect: boolean | null
  misconceptionCategory: string | null
  hintsRequested: number
  timeSpentSeconds: number
  criticalJunctionType: string | null
  junctionDifficulty: string | null
  scaffoldingLevelAtTime: string
  masteryScoreAtTime: number
  interactionType: string
  createdAt: Date
  aiGenerated: boolean
  feedbackText: string | null
  hintText: string | null
  counterfactualText: string | null
  aiMisconceptionCategory: string | null
  bottomedOut: boolean
  hintIndexAtResolve: number
  aiLatencyMs: number | null
  aiModel: string | null
  promptVersion: string | null
}): InteractionDto {
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
    aiGenerated: interaction.aiGenerated,
    feedbackText: interaction.feedbackText,
    hintText: interaction.hintText,
    counterfactualText: interaction.counterfactualText,
    aiMisconceptionCategory: interaction.aiMisconceptionCategory,
    bottomedOut: interaction.bottomedOut,
    hintIndexAtResolve: interaction.hintIndexAtResolve,
    aiLatencyMs: interaction.aiLatencyMs,
    aiModel: interaction.aiModel,
    promptVersion: interaction.promptVersion,
  }
}

export async function getSessionInteractions(sessionId: string): Promise<InteractionDto[]> {
  const interactions = await prisma.interaction.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  })
  return interactions.map(toInteractionDto)
}
