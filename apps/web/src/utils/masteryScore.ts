export interface MasteryMetrics {
  totalPredictions: number
  correctPredictions: number
  conceptualCorrect: number
  conceptualTotal: number
  proceduralCorrect: number
  proceduralTotal: number
  hintsRequested: number
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

  // Penalise hint usage: heavy hint reliance indicates lower mastery.
  const hintPenalty = Math.min(0.2, (metrics.hintsRequested / Math.max(metrics.totalPredictions, 1)) * 0.4)

  // Bonus for consecutive correct answers: sustained accuracy matters more than average.
  const streakBonus = Math.min(0.1, metrics.consecutiveCorrect * 0.02)

  const overallScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        overallAccuracy * 60 + conceptualAccuracy * 25 + proceduralAccuracy * 15 - hintPenalty * 100 + streakBonus * 100,
      ),
    ),
  )

  const conceptualScore = Math.round(conceptualAccuracy * 100)
  const proceduralScore = Math.round(proceduralAccuracy * 100)

  let recommendedLevel: MasteryAssessment['recommendedLevel']
  let reasoning: string

  if (overallScore >= 80 && metrics.consecutiveCorrect >= 5 && metrics.hintsRequested === 0) {
    recommendedLevel = 'NONE'
    reasoning = `Score ${overallScore}/100 with ${metrics.consecutiveCorrect} consecutive correct and no hints. Scaffolding fully removed.`
  } else if (overallScore >= 65 && metrics.hintsRequested <= 1) {
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
