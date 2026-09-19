import { describe, it, expect } from 'vitest'
import {
  requiredConsecutiveCorrect,
  evaluateProbe,
  nextRemediationLevel,
  shouldAbandonByJunctionCount,
  shouldAbandonBySessionGap,
} from './misconceptionEvent.service'

describe('requiredConsecutiveCorrect', () => {
  it('requires two consecutive correct probes for a 2-option junction', () => {
    expect(requiredConsecutiveCorrect(2)).toBe(2)
  })

  it('requires only one correct probe for a 3+ option junction', () => {
    expect(requiredConsecutiveCorrect(3)).toBe(1)
    expect(requiredConsecutiveCorrect(4)).toBe(1)
  })
})

describe('evaluateProbe', () => {
  it('does not resolve after the first clean correct probe on a 2-option junction', () => {
    const result = evaluateProbe({ consecutiveCorrect: 0, remediationCount: 0, optionCount: 2, correct: true, hintUsed: false })
    expect(result).toEqual({ consecutiveCorrect: 1, remediationCount: 0, status: 'OPEN', shouldEscalate: false, bottomedOut: false })
  })

  it('resolves after two consecutive clean correct probes on a 2-option junction', () => {
    const result = evaluateProbe({ consecutiveCorrect: 1, remediationCount: 0, optionCount: 2, correct: true, hintUsed: false })
    expect(result.status).toBe('RESOLVED')
    expect(result.consecutiveCorrect).toBe(2)
  })

  it('resolves after a single clean correct probe on a 3+ option junction', () => {
    const result = evaluateProbe({ consecutiveCorrect: 0, remediationCount: 0, optionCount: 3, correct: true, hintUsed: false })
    expect(result.status).toBe('RESOLVED')
  })

  it('does not credit a correct probe that used a hint, and breaks the streak', () => {
    const result = evaluateProbe({ consecutiveCorrect: 1, remediationCount: 0, optionCount: 2, correct: true, hintUsed: true })
    expect(result).toEqual({ consecutiveCorrect: 0, remediationCount: 0, status: 'OPEN', shouldEscalate: false, bottomedOut: false })
  })

  it('resets consecutiveCorrect and escalates on a wrong probe', () => {
    const result = evaluateProbe({ consecutiveCorrect: 1, remediationCount: 0, optionCount: 2, correct: false, hintUsed: false })
    expect(result.consecutiveCorrect).toBe(0)
    expect(result.remediationCount).toBe(1)
    expect(result.shouldEscalate).toBe(true)
    expect(result.status).toBe('OPEN')
  })

  it('bottoms out at the third remediation and marks the event persistent', () => {
    const result = evaluateProbe({ consecutiveCorrect: 0, remediationCount: 2, optionCount: 2, correct: false, hintUsed: false })
    expect(result.remediationCount).toBe(3)
    expect(result.status).toBe('PERSISTENT')
    expect(result.bottomedOut).toBe(true)
    expect(result.shouldEscalate).toBe(false)
  })
})

describe('nextRemediationLevel', () => {
  it('is one more than the current remediation count', () => {
    expect(nextRemediationLevel(0)).toBe(1)
    expect(nextRemediationLevel(1)).toBe(2)
    expect(nextRemediationLevel(2)).toBe(3)
  })
})

describe('shouldAbandonByJunctionCount', () => {
  it('does not abandon at exactly the threshold', () => {
    expect(shouldAbandonByJunctionCount(25)).toBe(false)
  })

  it('abandons past the threshold', () => {
    expect(shouldAbandonByJunctionCount(26)).toBe(true)
  })
})

describe('shouldAbandonBySessionGap', () => {
  it('does not abandon after only one completed session since detection', () => {
    expect(shouldAbandonBySessionGap(1)).toBe(false)
  })

  it('abandons after two completed sessions since detection with no resolution', () => {
    expect(shouldAbandonBySessionGap(2)).toBe(true)
  })
})
