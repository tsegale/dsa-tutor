export interface CreateSessionDto {
  algorithmTopicId: string
  mode: 'DEMO' | 'PRACTICE' | 'HANDS_ON'
  scaffoldingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
}

export interface UpdateSessionDto {
  endTime?: string
  completed?: boolean
  scaffoldingLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  challengeExplanation?: string
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
