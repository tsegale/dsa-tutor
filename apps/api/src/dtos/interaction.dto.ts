export interface CreateInteractionDto {
  sessionId: string
  stepIndex: number
  predictionSubmitted: string
  predictionCorrect: boolean
  misconceptionCategory: string | null
  hintsRequested: number
  timeSpentSeconds: number
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
  createdAt: string
}
