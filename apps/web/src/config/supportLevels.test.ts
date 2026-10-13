import { describe, it, expect } from 'vitest'
import { ScaffoldingLevel } from '@dsa-tutor/types'
import { SUPPORT_LEVEL, nextLevelDownLine } from './supportLevels'

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
