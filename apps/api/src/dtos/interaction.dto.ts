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
  // What the student actually saw from the feedback mechanism - see
  // remediation doc Phase 8.1. All optional so older callers keep working.
  aiGenerated?: boolean
  feedbackText?: string | null
  hintText?: string | null
  counterfactualText?: string | null
  aiMisconceptionCategory?: string | null
  bottomedOut?: boolean
  hintIndexAtResolve?: number
  aiLatencyMs?: number | null
  aiModel?: string | null
  promptVersion?: string | null
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
}
