export interface AssessmentItemDto {
  id: string
  order: number
  itemType: 'MULTIPLE_CHOICE' | 'TRACE'
  stem: string
  options: Array<{ id: string; text: string }> | null
}

export interface AssessmentResponseSummaryDto {
  itemId: string
  response: string
}

export interface AssessmentAttemptDto {
  id: string
  assessmentId: string
  code: string
  phase: 'PRE' | 'POST'
  title: string
  items: AssessmentItemDto[]
  // Answers already recorded for this attempt (never isCorrect/score - see
  // submitResponse) so a reload can resume where the participant left off
  // instead of restarting from question 1.
  responses: AssessmentResponseSummaryDto[]
  startedAt: string
  completedAt: string | null
}
