export interface CreateSessionDto {
  algorithmTopicId: string
  mode: 'DEMO' | 'PRACTICE' | 'HANDS_ON' | 'FEYNMAN' | 'CODE' | 'CHALLENGE'
  scaffoldingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
}

export interface UpdateSessionDto {
  endTime?: string
  completed?: boolean
  scaffoldingLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  challengeExplanation?: string
  // Provided when completed is true, so the update can also upsert this
  // topic's TopicMastery row (see remediation doc Phase 8.3) - the
  // dashboard's mastery rings and any retention analysis read from that
  // table, not by re-deriving it from every Interaction row each time.
  overallScore?: number
  conceptualScore?: number
  proceduralScore?: number
  totalPredictions?: number
  correctPredictions?: number
  // Self-report cognitive load/confidence, taken once at session end.
  // Omitted entirely if the student skipped the survey.
  mentalEffort?: number
  confidence?: number
}

export interface SessionDto {
  id: string
  userId: string
  algorithmTopicId: string
  mode: string
  scaffoldingLevel: string
  startTime: string
  endTime: string | null
  completed: boolean
  challengeExplanation: string | null
  topic: {
    name: string
    displayName: string
    track: string
    difficulty: string
  }
}
