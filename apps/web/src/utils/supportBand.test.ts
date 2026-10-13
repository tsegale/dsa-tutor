import { describe, it, expect } from 'vitest'
import { ScaffoldingLevel, type TopicDto } from '@dsa-tutor/types'
import { masteryIndex, overallSupport } from './supportBand'

const topic = (masteryPercent: number, isLocked = false) => ({ id: String(Math.random()), name: 't', masteryPercent, isLocked }) as unknown as TopicDto

describe('masteryIndex', () => {
  it('averages mastery over unlocked topics only', () => {
    expect(masteryIndex([topic(80), topic(40), topic(100, true)])).toBe(60)
    expect(masteryIndex([])).toBe(0)
  })
})

describe('overallSupport', () => {
  it('starts at full support with no data', () => {
    expect(overallSupport([topic(0), topic(0)])).toEqual({
      level: ScaffoldingLevel.HIGH,
      score: 0,
      reasoning: 'No interaction data yet. Starting with maximum support.',
    })
  })

  it('places the mastery index on the same thresholds as calculateMastery', () => {
    expect(overallSupport([topic(44)]).level).toBe(ScaffoldingLevel.HIGH)
    expect(overallSupport([topic(45)]).level).toBe(ScaffoldingLevel.MEDIUM)
    expect(overallSupport([topic(65)]).level).toBe(ScaffoldingLevel.LOW)
    expect(overallSupport([topic(80)]).level).toBe(ScaffoldingLevel.NONE)
  })

  it('states its reasoning in calculateMastery words', () => {
    expect(overallSupport([topic(62)]).reasoning).toBe('Score 62/100. Hints on request, targeted feedback on errors.')
  })
})
