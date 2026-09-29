/**
 * Whether an answer was the learner's first attempt at a junction.
 *
 * `wrongAttempts` is PredictionZone's per-step counter, which a wrong answer
 * increments before it is reported: a first answer that is wrong arrives
 * with 1, a first answer that is right with 0. Reading "first attempt" as
 * `wrongAttempts === 0` (or from the hint index, which the same wrong answer
 * advances) therefore misses every wrong first attempt - exactly the answers
 * the misconception loop exists to act on.
 */
export function isFirstAttempt(correct: boolean, wrongAttempts: number): boolean {
  return correct ? wrongAttempts === 0 : wrongAttempts === 1
}
