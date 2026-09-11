import { describe, it, expect } from 'vitest'
import { calculateMastery, gateScaffoldingReduction, type MasteryMetrics } from './masteryScore'

function metrics(overrides: Partial<MasteryMetrics> = {}): MasteryMetrics {
  return {
    totalPredictions: 0,
    correctPredictions: 0,
    conceptualCorrect: 0,
    conceptualTotal: 0,
    proceduralCorrect: 0,
    proceduralTotal: 0,
    hintsRequested: 0,
    consecutiveCorrect: 0,
    ...overrides,
  }
}

describe('calculateMastery', () => {
  it('recommends HIGH with zero score when there is no interaction data yet', () => {
    const assessment = calculateMastery(metrics())

    expect(assessment.overallScore).toBe(0)
    expect(assessment.recommendedLevel).toBe('HIGH')
  })

  it('recommends NONE only when score, streak, and zero hints all clear the bar', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        consecutiveCorrect: 10,
        hintsRequested: 0,
      }),
    )

    expect(assessment.recommendedLevel).toBe('NONE')
  })

  it('does not recommend NONE if any hints were requested, even with a perfect streak', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        consecutiveCorrect: 10,
        hintsRequested: 1,
      }),
    )

    expect(assessment.recommendedLevel).not.toBe('NONE')
  })

  it('recommends LOW for solid accuracy with at most one hint', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 9,
        proceduralTotal: 10,
        proceduralCorrect: 9,
        consecutiveCorrect: 3,
        hintsRequested: 1,
      }),
    )

    expect(assessment.recommendedLevel).toBe('LOW')
  })

  it('recommends HIGH for a struggling learner', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 2,
        proceduralTotal: 10,
        proceduralCorrect: 2,
        hintsRequested: 6,
      }),
    )

    expect(assessment.recommendedLevel).toBe('HIGH')
    expect(assessment.overallScore).toBeLessThan(45)
  })

  it('never returns a score outside 0-100', () => {
    const high = calculateMastery(
      metrics({ totalPredictions: 20, correctPredictions: 20, proceduralTotal: 20, proceduralCorrect: 20, consecutiveCorrect: 20 }),
    )
    const low = calculateMastery(
      metrics({ totalPredictions: 20, correctPredictions: 0, proceduralTotal: 20, proceduralCorrect: 0, hintsRequested: 20 }),
    )

    expect(high.overallScore).toBeLessThanOrEqual(100)
    expect(low.overallScore).toBeGreaterThanOrEqual(0)
  })
})

describe('gateScaffoldingReduction', () => {
  it('blocks a HIGH to LOW jump on a single correct answer', () => {
    expect(gateScaffoldingReduction('HIGH', 'LOW', 1)).toBe('HIGH')
  })

  it('steps HIGH down to MEDIUM once 3 consecutive correct are reached, never skipping to LOW', () => {
    expect(gateScaffoldingReduction('HIGH', 'LOW', 3)).toBe('MEDIUM')
  })

  it('keeps MEDIUM until 4 consecutive correct are reached', () => {
    expect(gateScaffoldingReduction('MEDIUM', 'NONE', 3)).toBe('MEDIUM')
    expect(gateScaffoldingReduction('MEDIUM', 'NONE', 4)).toBe('LOW')
  })

  it('keeps LOW until 5 consecutive correct are reached', () => {
    expect(gateScaffoldingReduction('LOW', 'NONE', 4)).toBe('LOW')
    expect(gateScaffoldingReduction('LOW', 'NONE', 5)).toBe('NONE')
  })

  it('never gates restoring support after a mistake', () => {
    expect(gateScaffoldingReduction('NONE', 'HIGH', 0)).toBe('HIGH')
    expect(gateScaffoldingReduction('LOW', 'MEDIUM', 0)).toBe('MEDIUM')
  })

  it('is a no-op when the target level matches the current level', () => {
    expect(gateScaffoldingReduction('MEDIUM', 'MEDIUM', 0)).toBe('MEDIUM')
  })
})
