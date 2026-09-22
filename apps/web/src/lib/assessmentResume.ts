import type { AssessmentItemDto, AssessmentResponseSummaryDto } from '@dsa-tutor/types'

export interface AssessmentResumeState {
  index: number
  answer: string
}

// Where to resume an in-progress attempt: the first item without a stored
// response, with that item's prior answer restored if it has one (every
// item already answered but the attempt never completed - resume on the
// last item so Finish can be retried).
export function resumeState(
  items: AssessmentItemDto[],
  responses: AssessmentResponseSummaryDto[],
): AssessmentResumeState {
  const answered = new Map(responses.map((r) => [r.itemId, r.response]))
  const firstUnansweredIndex = items.findIndex((item) => !answered.has(item.id))
  const index = firstUnansweredIndex === -1 ? Math.max(0, items.length - 1) : firstUnansweredIndex

  return { index, answer: answered.get(items[index]?.id ?? '') ?? '' }
}
