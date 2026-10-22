import type { CodeEvalResponse } from '@dsa-tutor/types'
import type { CodeChallenge } from '@/config/codeChallenges'

/**
 * What happens to the run when a code challenge is answered correctly.
 *
 * Code Mode used to have no way out. A correct answer printed "Your code is
 * correct!" and left the primary button reading "Run my code", so the
 * learner ran the same code again and again with nothing moving - on every
 * topic but Bubble Sort, whose challenge re-seeds the run from the array
 * the student's own code produced and so appears to progress by itself.
 *
 * The rule: a correct answer always moves the run on, by one of exactly two
 * routes. Either the challenge re-seeds the run, or the step offers
 * Continue. codeModeAdvance.test.ts checks that over every challenge, so a
 * new one cannot be added that dead-ends.
 */
export type CodeAdvance = 'reseed' | 'continue' | 'stay'

/** A challenge whose read-back IS the data structure restarts the run from
 * what the student's code produced. A scalar answer (an address, a count,
 * True/False) has nothing to put on the canvas. */
export function reseedsRun(result: Pick<CodeEvalResponse, 'executeVisually' | 'resultingState'>, challenge: Pick<CodeChallenge, 'seedsNextRun'>): boolean {
  return Boolean(result.executeVisually && challenge.seedsNextRun && Array.isArray(result.resultingState))
}

export function codeModeAdvance(
  result: Pick<CodeEvalResponse, 'isLogicallyCorrect' | 'hasSyntaxError' | 'executeVisually' | 'resultingState'>,
  challenge: Pick<CodeChallenge, 'seedsNextRun'>,
): CodeAdvance {
  // Code that did not run was not graded, so the step is unchanged.
  if (result.hasSyntaxError || !result.isLogicallyCorrect) return 'stay'
  return reseedsRun(result, challenge) ? 'reseed' : 'continue'
}
