import { describe, it, expect } from 'vitest'
import { resumeState } from './assessmentResume'
import type { AssessmentItemDto, AssessmentResponseSummaryDto } from '@dsa-tutor/types'

function makeItems(count: number): AssessmentItemDto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    order: i,
    itemType: 'MULTIPLE_CHOICE',
    stem: `Question ${i + 1}`,
    options: [{ id: 'a', text: 'A' }],
  }))
}

describe('resumeState', () => {
  it('resumes at the first unanswered item with prior answers intact', () => {
    const items = makeItems(8)
    const responses: AssessmentResponseSummaryDto[] = [
      { itemId: 'item-1', response: 'a' },
      { itemId: 'item-2', response: 'b' },
      { itemId: 'item-3', response: 'c' },
    ]

    const result = resumeState(items, responses)

    expect(result.index).toBe(3)
    expect(items[result.index].id).toBe('item-4')
    expect(result.answer).toBe('')
  })

  it('starts at the first item for a brand new attempt with no responses', () => {
    const items = makeItems(8)
    expect(resumeState(items, [])).toEqual({ index: 0, answer: '' })
  })

  it('resumes on the last item, with its answer restored, when every item is already answered', () => {
    const items = makeItems(3)
    const responses: AssessmentResponseSummaryDto[] = [
      { itemId: 'item-1', response: 'a' },
      { itemId: 'item-2', response: 'b' },
      { itemId: 'item-3', response: 'c' },
    ]

    const result = resumeState(items, responses)

    expect(result.index).toBe(2)
    expect(result.answer).toBe('c')
  })
})
