import { describe, it, expect } from 'vitest'
import { ScaffoldingLevel } from '@dsa-tutor/types'
import { SUPPORT_LEVEL, nextLevelDownLine, pinnedLevel, pinnedReasoning } from './supportLevels'

describe('SUPPORT_LEVEL', () => {
  it('names the levels in the learner language, with fewer segments as support fades', () => {
    expect(SUPPORT_LEVEL[ScaffoldingLevel.HIGH]).toEqual({ label: 'Full support', segments: 4 })
    expect(SUPPORT_LEVEL[ScaffoldingLevel.MEDIUM]).toEqual({ label: 'Guided', segments: 3 })
    expect(SUPPORT_LEVEL[ScaffoldingLevel.LOW]).toEqual({ label: 'Minimal', segments: 2 })
    expect(SUPPORT_LEVEL[ScaffoldingLevel.NONE]).toEqual({ label: 'Independent', segments: 1 })
  })
})

describe('nextLevelDownLine', () => {
  it('states the next level and the streak the fading gate requires', () => {
    expect(nextLevelDownLine(ScaffoldingLevel.HIGH)).toBe(
      'At Guided: hints on request, targeted feedback on errors. Support steps down after 3 correct answers in a row.',
    )
    expect(nextLevelDownLine(ScaffoldingLevel.MEDIUM)).toBe(
      'At Minimal: hints available on request only, no proactive support. Support steps down after 4 correct answers in a row.',
    )
    expect(nextLevelDownLine(ScaffoldingLevel.LOW)).toBe('At Independent: scaffolding fully removed. Support steps down after 5 correct answers in a row.')
  })

  it('says Independent is the floor', () => {
    expect(nextLevelDownLine(ScaffoldingLevel.NONE)).toMatch(/least support there is/)
  })
})

describe('pinnedLevel', () => {
  it('pins the two fixed intensities and leaves adaptive alone', () => {
    expect(pinnedLevel('FULL')).toBe(ScaffoldingLevel.HIGH)
    expect(pinnedLevel('MINIMAL')).toBe(ScaffoldingLevel.LOW)
    expect(pinnedLevel('ADAPTIVE')).toBeNull()
  })

  it('says in the chip why support is not adapting', () => {
    expect(pinnedReasoning(ScaffoldingLevel.LOW, 62)).toBe('Score 62/100. Set to Minimal on your profile, so support does not adapt.')
  })
})
