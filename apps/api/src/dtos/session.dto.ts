export interface CreateSessionDto {
  algorithmTopicId: string
  mode: 'DEMO' | 'PRACTICE'
  scaffoldingLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
}

export interface UpdateSessionDto {
  endTime?: string
  completed?: boolean
  scaffoldingLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
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
  topic: {
    name: string
    displayName: string
    track: string
    difficulty: string
  }
}
