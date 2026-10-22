import { describe, expect, it } from 'vitest'
import { FEYNMAN_NO_RUBRIC_REASON, feynmanAccess } from './feynmanAccess'

describe('feynmanAccess', () => {
  it('is available as soon as the topic has a rubric', () => {
    // It used to be LOCKED until a Practice run of the topic was complete.
    // That gate is gone, so a student may explain the algorithm back first.
    expect(feynmanAccess({ classic: false, hasRubric: true })).toEqual({ state: 'AVAILABLE', reason: null })
  })

  it('says why a topic without a rubric has none', () => {
    expect(feynmanAccess({ classic: false, hasRubric: false })).toEqual({ state: 'UNAVAILABLE', reason: FEYNMAN_NO_RUBRIC_REASON })
  })

  it('is never available in Classic, whatever else is true', () => {
    // The study's control condition, not a lock: Classic shows no tutor
    // feature at all, which is the manipulation being measured.
    expect(feynmanAccess({ classic: true, hasRubric: true })).toEqual({ state: 'UNAVAILABLE', reason: null })
  })

  it('offers no state that asks the learner to earn it', () => {
    const states = [
      feynmanAccess({ classic: false, hasRubric: true }).state,
      feynmanAccess({ classic: false, hasRubric: false }).state,
      feynmanAccess({ classic: true, hasRubric: true }).state,
    ]
    expect(states).not.toContain('LOCKED')
  })
})
