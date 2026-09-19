export interface MisconceptionEventDto {
  id: string
  algorithmTopicId: string
  category: string
  status: string
  remediationCount: number
  probeCount: number
  consecutiveCorrect: number
  junctionsSinceDetection: number
  bottomedOut: boolean
  detectedAt: string
  resolvedAt: string | null
}

export interface RemediationDto {
  id: string
  eventId: string
  taskType: string
  level: number
  payload: unknown
  presentedAt: string
}

export interface ProbeResultDto {
  event: MisconceptionEventDto
  shouldEscalate: boolean
  nextLevel: number
}
