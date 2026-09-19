import { describe, it, expect } from 'vitest'
import { scoreResponse } from './assessment.service'

describe('scoreResponse', () => {
  it('scores a correct multiple-choice response', () => {
    const item = { itemType: 'MULTIPLE_CHOICE' as const, correctOptionId: 'b', maxScore: 1 }
    expect(scoreResponse(item, 'b')).toEqual({ isCorrect: true, score: 1 })
  })

  it('scores an incorrect multiple-choice response as zero', () => {
    const item = { itemType: 'MULTIPLE_CHOICE' as const, correctOptionId: 'b', maxScore: 1 }
    expect(scoreResponse(item, 'a')).toEqual({ isCorrect: false, score: 0 })
  })

  it('does not treat an empty response as a match against a null answer key', () => {
    const item = { itemType: 'MULTIPLE_CHOICE' as const, correctOptionId: null, maxScore: 1 }
    expect(scoreResponse(item, '')).toEqual({ isCorrect: false, score: 0 })
  })

  it('scores a trace response by exact match after trimming whitespace', () => {
    const item = { itemType: 'TRACE' as const, correctOptionId: '3,2,1,4', maxScore: 1 }
    expect(scoreResponse(item, '  3,2,1,4  ')).toEqual({ isCorrect: true, score: 1 })
  })

  it('rejects a trace response that differs by internal spacing', () => {
    const item = { itemType: 'TRACE' as const, correctOptionId: '3,2,1,4', maxScore: 1 }
    expect(scoreResponse(item, '3, 2, 1, 4')).toEqual({ isCorrect: false, score: 0 })
  })

  it('honours a maxScore greater than one on a correct answer', () => {
    const item = { itemType: 'MULTIPLE_CHOICE' as const, correctOptionId: 'c', maxScore: 3 }
    expect(scoreResponse(item, 'c')).toEqual({ isCorrect: true, score: 3 })
  })
})
