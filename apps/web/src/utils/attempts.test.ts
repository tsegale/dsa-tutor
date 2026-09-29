import { describe, expect, it } from 'vitest'
import { isFirstAttempt } from './attempts'

describe('first attempt at a junction', () => {
  it('counts a wrong first answer as the first attempt (the counter already includes it)', () => {
    expect(isFirstAttempt(false, 1)).toBe(true)
  })

  it('counts a right first answer as the first attempt', () => {
    expect(isFirstAttempt(true, 0)).toBe(true)
  })

  it('does not count retries, right or wrong', () => {
    expect(isFirstAttempt(false, 2)).toBe(false)
    expect(isFirstAttempt(true, 1)).toBe(false)
    expect(isFirstAttempt(true, 2)).toBe(false)
  })
})
