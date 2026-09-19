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
    recentHintCounts: [],
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

  it('recommends NONE only when score, streak, and zero recent hints all clear the bar', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        consecutiveCorrect: 10,
        recentHintCounts: [],
      }),
    )

    expect(assessment.recommendedLevel).toBe('NONE')
  })

  it('does not recommend NONE if a hint was requested within the recent window, even with a perfect streak', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        consecutiveCorrect: 10,
        recentHintCounts: [1],
      }),
    )

    expect(assessment.recommendedLevel).not.toBe('NONE')
  })

  it('recommends LOW for solid accuracy with at most one recent hint', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 9,
        proceduralTotal: 10,
        proceduralCorrect: 9,
        consecutiveCorrect: 3,
        recentHintCounts: [1],
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
        recentHintCounts: [1, 1, 1, 1, 1, 1],
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
      metrics({
        totalPredictions: 20,
        correctPredictions: 0,
        proceduralTotal: 20,
        proceduralCorrect: 0,
        hintsRequested: 20,
        recentHintCounts: new Array(10).fill(2),
      }),
    )

    expect(high.overallScore).toBeLessThanOrEqual(100)
    expect(low.overallScore).toBeGreaterThanOrEqual(0)
  })

  it('does not subtract score for hint usage - heavy hint use with perfect accuracy still scores high', () => {
    const noHints = calculateMastery(
      metrics({ totalPredictions: 10, correctPredictions: 10, proceduralTotal: 10, proceduralCorrect: 10 }),
    )
    const heavyHints = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        hintsRequested: 10,
        recentHintCounts: new Array(10).fill(1),
      }),
    )

    expect(heavyHints.overallScore).toBe(noHints.overallScore)
  })

  it('scores a procedural-only learner on procedural + overall accuracy alone, not capped by absent conceptual data', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        proceduralTotal: 10,
        proceduralCorrect: 10,
        conceptualTotal: 0,
        conceptualCorrect: 0,
      }),
    )

    // Old weighting (60/25/15 with missing categories counted as 0%)
    // would cap this at 75 even at perfect accuracy.
    expect(assessment.overallScore).toBe(100)
  })

  it('scores a conceptual-only learner on conceptual + overall accuracy alone, not capped by absent procedural data', () => {
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 10,
        correctPredictions: 10,
        conceptualTotal: 10,
        conceptualCorrect: 10,
        proceduralTotal: 0,
        proceduralCorrect: 0,
      }),
    )

    expect(assessment.overallScore).toBe(100)
  })

  it('windowed hint gate: hints outside the recent window no longer block fading', () => {
    // 6 hints total, but all of them fell out of the last-10-prediction
    // window - only the most recent 10 predictions (all hint-free) count.
    const assessment = calculateMastery(
      metrics({
        totalPredictions: 20,
        correctPredictions: 20,
        proceduralTotal: 20,
        proceduralCorrect: 20,
        consecutiveCorrect: 10,
        hintsRequested: 6,
        recentHintCounts: new Array(10).fill(0),
      }),
    )

    expect(assessment.recommendedLevel).toBe('NONE')
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
