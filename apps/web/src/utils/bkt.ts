export interface BktParameters {
  /** Prior probability that the learner already knows the skill before step 1: P(L_0). */
  pInit: number
  /** Probability of transitioning from unlearned to learned after an opportunity: P(T). */
  pTransit: number
  /** Slip probability (answering incorrectly despite knowing the skill): P(S). */
  pSlip: number
  /** Guess probability (answering correctly despite not knowing the skill): P(G). */
  pGuess: number
}

export const DEFAULT_BKT_PARAMS: BktParameters = {
  pInit: 0.25,
  pTransit: 0.12,
  pSlip: 0.1,
  pGuess: 0.25,
}

/**
 * Performs a single Corbett & Anderson (1995) Bayesian Knowledge Tracing
 * posterior + learning transition update for one observed outcome.
 */
export function updateBktStep(
  pLearned: number,
  correct: boolean,
  params: BktParameters = DEFAULT_BKT_PARAMS,
): number {
  const { pTransit, pSlip, pGuess } = params
  const clampedPrior = Math.max(0, Math.min(1, pLearned))

  let posteriorGivenObs: number
  if (correct) {
    const num = clampedPrior * (1 - pSlip)
    const denom = num + (1 - clampedPrior) * pGuess
    posteriorGivenObs = denom > 0 ? num / denom : clampedPrior
  } else {
    const num = clampedPrior * pSlip
    const denom = num + (1 - clampedPrior) * (1 - pGuess)
    posteriorGivenObs = denom > 0 ? num / denom : clampedPrior
  }

  const nextLearned = posteriorGivenObs + (1 - posteriorGivenObs) * pTransit
  return Math.max(0, Math.min(1, nextLearned))
}

/**
 * Returns the step-by-step P(L_t) trajectory (0.0 to 1.0) across a sequence
 * of boolean prediction outcomes.
 */
export function computeBktTrajectory(
  outcomes: boolean[],
  params: BktParameters = DEFAULT_BKT_PARAMS,
): number[] {
  let current = params.pInit
  const trajectory: number[] = []
  for (const outcome of outcomes) {
    current = updateBktStep(current, outcome, params)
    trajectory.push(current)
  }
  return trajectory
}

/**
 * Returns the integer percentage (0 to 100) for P(L_t) after observing a
 * sequence of boolean outcomes. Returns 0 when no outcomes have been observed
 * so empty states match the heuristic mastery baseline.
 */
export function computeBktMastery(
  outcomes: boolean[],
  params: BktParameters = DEFAULT_BKT_PARAMS,
): number {
  if (outcomes.length === 0) return 0
  const trajectory = computeBktTrajectory(outcomes, params)
  return Math.round(trajectory[trajectory.length - 1] * 100)
}

/**
 * Reconstructs a deterministic outcome sequence from aggregate counts
 * (total, correct, and trailing consecutiveCorrect) and returns the BKT
 * mastery percentage (0 to 100). Used for shadow-mode comparison alongside
 * the fixed heuristic mastery score in calculateMastery and StudentProgressTable.
 */
export function computeBktMasteryFromCounts(
  correctCount: number,
  totalCount: number,
  consecutiveCorrect = 0,
  params: BktParameters = DEFAULT_BKT_PARAMS,
): number {
  if (totalCount <= 0) return 0
  const total = Math.max(0, Math.min(200, Math.round(totalCount)))
  const correct = Math.max(0, Math.min(total, Math.round(correctCount)))
  const trailingStreak = Math.max(0, Math.min(correct, Math.round(consecutiveCorrect)))

  const prefixLen = total - trailingStreak
  const prefixCorrect = correct - trailingStreak
  const outcomes: boolean[] = []

  if (prefixLen > 0) {
    // Spread prior correct/incorrect answers evenly using Bresenham-style stepping,
    // ending the prefix with an incorrect outcome when prefixLen > prefixCorrect
    // (since trailingStreak represents consecutive correct answers at the end).
    const innerLen = trailingStreak > 0 && prefixLen > prefixCorrect ? prefixLen - 1 : prefixLen
    let placedCorrect = 0
    for (let i = 0; i < innerLen; i++) {
      const targetCorrect = Math.round(((i + 1) * prefixCorrect) / Math.max(1, innerLen))
      if (targetCorrect > placedCorrect && placedCorrect < prefixCorrect) {
        outcomes.push(true)
        placedCorrect++
      } else {
        outcomes.push(false)
      }
    }
    if (innerLen < prefixLen) {
      outcomes.push(false)
    }
  }

  for (let i = 0; i < trailingStreak; i++) {
    outcomes.push(true)
  }

  return computeBktMastery(outcomes, params)
}
