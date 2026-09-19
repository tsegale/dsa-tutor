/** How many of the most recent predictions the fading gate looks at when
 * deciding whether hint usage should block reducing support. Kept here
 * (rather than inlined) since AlgorithmPage needs the same number to know
 * how many entries to keep in recentHintCounts. */
export const RECENT_HINT_WINDOW = 10

export interface MasteryMetrics {
  totalPredictions: number
  correctPredictions: number
  conceptualCorrect: number
  conceptualTotal: number
  proceduralCorrect: number
  proceduralTotal: number
  /** Cumulative hints requested this session - reported to the student
   * and used for badges/analytics, but never subtracted from the mastery
   * score: asking for help is not a penalty. */
  hintsRequested: number
  /** Hints requested on each of the last RECENT_HINT_WINDOW predictions,
   * oldest first, capped at RECENT_HINT_WINDOW entries. The fading gate
   * reads this window instead of the cumulative total, so hints asked
   * early in a session don't lock a student out of fading for the rest
   * of it - once enough hint-free predictions have followed, the window
   * ages them out. */
  recentHintCounts: number[]
  consecutiveCorrect: number
}

export interface MasteryAssessment {
  overallScore: number
  conceptualScore: number
  proceduralScore: number
  recommendedLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  reasoning: string
}

export function calculateMastery(metrics: MasteryMetrics): MasteryAssessment {
  if (metrics.totalPredictions === 0) {
    return {
      overallScore: 0,
      conceptualScore: 0,
      proceduralScore: 0,
      recommendedLevel: 'HIGH',
      reasoning: 'No interaction data yet. Starting with maximum support.',
    }
  }

  const overallAccuracy = metrics.correctPredictions / metrics.totalPredictions
  const conceptualAccuracy = metrics.conceptualTotal > 0 ? metrics.conceptualCorrect / metrics.conceptualTotal : 0
  const proceduralAccuracy = metrics.proceduralTotal > 0 ? metrics.proceduralCorrect / metrics.proceduralTotal : 0

  // Weighted toward raw overall accuracy, with conceptual/procedural
  // accuracy breaking it down further - but a category with no data at
  // all must not count as 0% accuracy against the student, or a learner
  // who has only ever faced procedural junctions (say) is capped at 75
  // regardless of how well they do. Only weights backed by real data
  // count, renormalised so they still sum to 100%.
  const weightedTerms: { accuracy: number; weight: number }[] = [
    { accuracy: overallAccuracy, weight: 60 },
    ...(metrics.conceptualTotal > 0 ? [{ accuracy: conceptualAccuracy, weight: 25 }] : []),
    ...(metrics.proceduralTotal > 0 ? [{ accuracy: proceduralAccuracy, weight: 15 }] : []),
  ]
  const totalWeight = weightedTerms.reduce((sum, term) => sum + term.weight, 0)
  const weightedAccuracy = weightedTerms.reduce((sum, term) => sum + term.accuracy * term.weight, 0) / totalWeight

  // Bonus for consecutive correct answers: sustained accuracy matters more than average.
  const streakBonus = Math.min(0.1, metrics.consecutiveCorrect * 0.02)

  const overallScore = Math.round(Math.max(0, Math.min(100, weightedAccuracy * 100 + streakBonus * 100)))

  const conceptualScore = Math.round(conceptualAccuracy * 100)
  const proceduralScore = Math.round(proceduralAccuracy * 100)

  const recentHintsRequested = metrics.recentHintCounts.reduce((sum, count) => sum + count, 0)

  let recommendedLevel: MasteryAssessment['recommendedLevel']
  let reasoning: string

  if (overallScore >= 80 && metrics.consecutiveCorrect >= 5 && recentHintsRequested === 0) {
    recommendedLevel = 'NONE'
    reasoning = `Score ${overallScore}/100 with ${metrics.consecutiveCorrect} consecutive correct and no hints in the last ${RECENT_HINT_WINDOW} predictions. Scaffolding fully removed.`
  } else if (overallScore >= 65 && recentHintsRequested <= 1) {
    recommendedLevel = 'LOW'
    reasoning = `Score ${overallScore}/100. Hints available on request only, no proactive support.`
  } else if (overallScore >= 45) {
    recommendedLevel = 'MEDIUM'
    reasoning = `Score ${overallScore}/100. Hints on request, targeted feedback on errors.`
  } else {
    recommendedLevel = 'HIGH'
    reasoning = `Score ${overallScore}/100. Maximum support with proactive hints and detailed feedback.`
  }

  return { overallScore, conceptualScore, proceduralScore, recommendedLevel, reasoning }
}

const LEVEL_ORDER: MasteryAssessment['recommendedLevel'][] = ['HIGH', 'MEDIUM', 'LOW', 'NONE']

// Consecutive correct predictions required before stepping support down one
// level, keyed by the level being stepped down FROM.
const CONSECUTIVE_REQUIRED_TO_REDUCE: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
  HIGH: 3,
  MEDIUM: 4,
  LOW: 5,
}

/**
 * calculateMastery's recommendedLevel is a raw diagnostic computed fresh
 * from the current score - taken directly, a single lucky early streak can
 * jump support down multiple levels at once (HIGH straight to LOW off one
 * correct answer). This gates that: support can only ever step down one
 * level at a time, and only once the learner has strung together enough
 * consecutive correct predictions for the level they're currently at.
 * Restoring support (a mistake pushing the target level back up) is never
 * gated - that should always take effect immediately.
 */
export function gateScaffoldingReduction(
  currentLevel: MasteryAssessment['recommendedLevel'],
  targetLevel: MasteryAssessment['recommendedLevel'],
  consecutiveCorrect: number,
): MasteryAssessment['recommendedLevel'] {
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel)
  const targetIndex = LEVEL_ORDER.indexOf(targetLevel)

  if (targetIndex <= currentIndex) return targetLevel

  const required = CONSECUTIVE_REQUIRED_TO_REDUCE[currentLevel as 'HIGH' | 'MEDIUM' | 'LOW']
  if (consecutiveCorrect >= required) return LEVEL_ORDER[currentIndex + 1]
  return currentLevel
}
