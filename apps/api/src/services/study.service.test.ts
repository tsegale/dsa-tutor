import { describe, it, expect } from 'vitest'
import { computeSusScore, isActiveParticipant, isPilotCode, normalizeParticipantCode } from './study.service'

describe('isActiveParticipant', () => {
  it('is false for a non-participant', () => {
    expect(isActiveParticipant({ participantCode: null, consentAt: null, withdrawnAt: null })).toBe(false)
  })

  it('is false for an enrolled participant who has not consented yet', () => {
    expect(isActiveParticipant({ participantCode: 'P01', consentAt: null, withdrawnAt: null })).toBe(false)
  })

  it('is true for an enrolled, consented, non-withdrawn participant', () => {
    expect(isActiveParticipant({ participantCode: 'P01', consentAt: new Date(), withdrawnAt: null })).toBe(true)
  })

  it('is false for a withdrawn participant even with a code and consent', () => {
    expect(isActiveParticipant({ participantCode: 'P01', consentAt: new Date(), withdrawnAt: new Date() })).toBe(false)
  })
})

describe('normalizeParticipantCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeParticipantCode('  p01  ')).toBe('P01')
  })
})

describe('isPilotCode', () => {
  // Participants no longer type a code, so no new PILOT- code is ever
  // issued. The rows from before auto-assignment keep theirs, and the
  // research exports still read this to leave their data out.
  it('recognises a pilot code whatever its case or padding', () => {
    expect(isPilotCode('PILOT-1')).toBe(true)
    expect(isPilotCode(' pilot-2 ')).toBe(true)
  })

  it('does not mistake an assigned participant code for a pilot', () => {
    for (const code of ['P01', 'P09', 'P12', 'P13']) expect(isPilotCode(code), code).toBe(false)
  })
})

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
