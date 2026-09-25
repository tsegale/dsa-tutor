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
  /** Why displayed feedback fell back (validator rule, "truncated", "error",
   * "stream_disconnected"); null when all displayed text was AI-generated. */
  aiFailureReason?: string | null
  // The data structure state the student was looking at when they
  // answered - only meaningful for the research misconception export, so
  // it is write-only from here: never mapped back into InteractionDto.
  dataStructureStateSnapshot?: unknown
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
