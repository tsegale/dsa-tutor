import { describe, it, expect } from 'vitest'
import { computeSusScore } from './study.service'

describe('computeSusScore', () => {
  it('scores an all-neutral response as 50', () => {
    expect(computeSusScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50)
  })

  it('scores the best possible response as 100', () => {
    // Odd items (positively worded) answered 5 (strongly agree), even
    // items (negatively worded) answered 1 (strongly disagree).
    expect(computeSusScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100)
  })

  it('scores the worst possible response as 0', () => {
    expect(computeSusScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0)
  })

  it('rejects a response array that is not exactly 10 items long', () => {
    expect(() => computeSusScore([3, 3, 3])).toThrow('INVALID_SUS_RESPONSES')
  })

  it('rejects a response outside the 1-5 Likert range', () => {
    expect(() => computeSusScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 6])).toThrow('INVALID_SUS_RESPONSES')
  })

  it('rejects a non-integer response', () => {
    expect(() => computeSusScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3.5])).toThrow('INVALID_SUS_RESPONSES')
  })
})
