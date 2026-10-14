import { describe, expect, it } from 'vitest'
import { FEYNMAN_LOCKED_REASON, FEYNMAN_NO_RUBRIC_REASON, feynmanAccess } from './feynmanAccess'

describe('feynmanAccess', () => {
  it('is locked, with its reason, until a Practice run is complete', () => {
    expect(feynmanAccess({ classic: false, hasRubric: true, runCompleted: false })).toEqual({ state: 'LOCKED', reason: FEYNMAN_LOCKED_REASON })
    expect(FEYNMAN_LOCKED_REASON).toBe('Complete a practice run to unlock.')
  })

  it('stays available once a run is complete', () => {
    expect(feynmanAccess({ classic: false, hasRubric: true, runCompleted: true })).toEqual({ state: 'AVAILABLE', reason: null })
  })

  it('says why a topic without a rubric has none', () => {
    expect(feynmanAccess({ classic: false, hasRubric: false, runCompleted: true })).toEqual({ state: 'UNAVAILABLE', reason: FEYNMAN_NO_RUBRIC_REASON })
  })

  it('is never available in Classic, whatever else is true', () => {
    expect(feynmanAccess({ classic: true, hasRubric: true, runCompleted: true }).state).toBe('UNAVAILABLE')
  })
})
