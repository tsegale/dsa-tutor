export interface CreateInteractionDto {
  sessionId: string
  stepIndex: number
  predictionSubmitted: string
  predictionCorrect: boolean
  misconceptionCategory: string | null
  hintsRequested: number
  timeSpentSeconds: number
  criticalJunctionType?: string | null
  junctionDifficulty?: string | null
  scaffoldingLevelAtTime?: string
  masteryScoreAtTime?: number
}

export interface InteractionDto {
  id: string
  sessionId: string
  stepIndex: number
  predictionSubmitted: string
  predictionCorrect: boolean
  misconceptionCategory: string | null
  hintsRequested: number
  timeSpentSeconds: number
  criticalJunctionType: string | null
  junctionDifficulty: string | null
  scaffoldingLevelAtTime: string
  masteryScoreAtTime: number
  createdAt: string
}
