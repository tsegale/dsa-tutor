import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BKT_PARAMS,
  computeBktMastery,
  computeBktMasteryFromCounts,
  computeBktTrajectory,
  updateBktStep,
} from './bkt'

describe('Bayesian Knowledge Tracing (bkt.ts)', () => {
  it('increases P(L_t) monotonically across consecutive correct responses', () => {
    const trajectory = computeBktTrajectory([true, true, true, true, true])
    expect(trajectory).toHaveLength(5)
    expect(trajectory[0]).toBeGreaterThan(DEFAULT_BKT_PARAMS.pInit)
    for (let i = 1; i < trajectory.length; i++) {
      expect(trajectory[i]).toBeGreaterThan(trajectory[i - 1])
    }
    expect(trajectory[4]).toBeGreaterThan(0.9)
  })

  it('decreases posterior before transition when an incorrect answer is observed', () => {
    const afterCorrect = updateBktStep(0.6, true)
    const afterWrong = updateBktStep(0.6, false)
    expect(afterCorrect).toBeGreaterThan(0.6)
    expect(afterWrong).toBeLessThan(0.6)
  })

  it('returns 0 when no outcomes have been observed', () => {
    expect(computeBktMastery([])).toBe(0)
    expect(computeBktMasteryFromCounts(0, 0, 0)).toBe(0)
  })

  it('weights recent consecutive streaks higher than early-only successes with the same total accuracy', () => {
    // 6/10 with a trailing 5-correct streak vs 6/10 ending in a mistake
    const recentStreak = computeBktMasteryFromCounts(6, 10, 5)
    const endedOnMistake = computeBktMasteryFromCounts(6, 10, 0)
    expect(recentStreak).toBeGreaterThan(endedOnMistake)
  })
})
