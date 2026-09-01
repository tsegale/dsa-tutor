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
  /** 'PREDICTION' (default) for a normal step submission, 'FEYNMAN' for a reverse-tutoring evaluation. */
  interactionType?: string
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
  interactionType: string
  createdAt: string
}
