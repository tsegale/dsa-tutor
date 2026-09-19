export interface AssessmentStatusDto {
  isParticipant: boolean
  pretestRequired: boolean
  posttestAvailable: boolean
  posttestCompleted: boolean
}

export interface AssessmentItemDto {
  id: string
  order: number
  itemType: 'MULTIPLE_CHOICE' | 'TRACE'
  stem: string
  options: Array<{ id: string; text: string }> | null
}

export interface AssessmentAttemptDto {
  id: string
  assessmentId: string
  code: string
  phase: 'PRE' | 'POST'
  title: string
  items: AssessmentItemDto[]
  startedAt: string
  completedAt: string | null
}
