import { describe, expect, it } from 'vitest'
import { XP, xpForInteraction } from './xp'

describe('server-side XP (4D.5)', () => {
  it('awards a correct prediction, including a row with no explicit type', () => {
    expect(xpForInteraction({ interactionType: 'PREDICTION', predictionCorrect: true })).toBe(XP.CORRECT_PREDICTION)
    expect(xpForInteraction({ predictionCorrect: true })).toBe(XP.CORRECT_PREDICTION)
    expect(xpForInteraction({ interactionType: 'COMPLEXITY_PREDICTION', predictionCorrect: true })).toBe(XP.CORRECT_PREDICTION)
  })

  it('awards nothing for a wrong or ungraded prediction', () => {
    expect(xpForInteraction({ interactionType: 'PREDICTION', predictionCorrect: false })).toBe(0)
    expect(xpForInteraction({ interactionType: 'PREDICTION', predictionCorrect: null })).toBe(0)
  })

  it('awards Feynman its base, plus the bonus only for a complete explanation', () => {
    expect(xpForInteraction({ interactionType: 'FEYNMAN', predictionCorrect: false })).toBe(XP.FEYNMAN_BASE)
    expect(xpForInteraction({ interactionType: 'FEYNMAN', predictionCorrect: true })).toBe(XP.FEYNMAN_BASE + XP.FEYNMAN_COMPLETE_BONUS)
  })

  it('awards a challenge once, on its attempt row', () => {
    expect(xpForInteraction({ interactionType: 'CHALLENGE_ATTEMPT', predictionCorrect: null })).toBe(XP.CHALLENGE)
  })

  it('never awards telemetry rows', () => {
    for (const type of ['VIEW_STEP', 'WORKED_STEP', 'SELF_EXPLANATION', 'HINT_REQUEST']) {
      expect(xpForInteraction({ interactionType: type, predictionCorrect: true })).toBe(0)
    }
  })
})
