import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType } from '@dsa-tutor/types'

/**
 * Given the snapshot the learner was asked to predict and the wrong
 * answer they submitted, returns a short trace (2 snapshots) of what
 * the algorithm state would look like if that wrong operation had been
 * applied instead of the correct one: first the array immediately after
 * the wrong operation, then the next comparison the algorithm would
 * make from that mistaken state.
 *
 * Only meaningful for SWAP_DECISION junctions today: PASS_COMPLETE,
 * EARLY_TERMINATION, and ALGORITHM_COMPLETE are questions about the
 * algorithm's invariants, not an operation that could be "applied" to
 * the array, so they resolve to an empty path.
 */
export function computeMistakePath(currentSnapshot: AlgorithmSnapshot, wrongAnswer: string): AlgorithmSnapshot[] {
  if (currentSnapshot.criticalJunctionType !== CriticalJunctionType.SWAP_DECISION) return []

  const state = currentSnapshot.dataStructureState
  if (!Array.isArray(state)) return []

  const [left, right] = currentSnapshot.activeIndices
  if (left === undefined || right === undefined) return []

  const leftValue = Number(state[left])
  const rightValue = Number(state[right])
  if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) return []

  const shouldSwap = leftValue > rightValue

  // A wrong answer to a binary swap decision always implies the operation
  // opposite the correct one; explicit "swap"/"no-swap" wording is
  // honored when present, otherwise (e.g. a wrong index answer) this
  // caller-guaranteed-incorrect assumption is the safe default.
  const normalized = wrongAnswer.trim().toLowerCase()
  const wrongOperationIsSwap =
    normalized === 'swap' || normalized === 'swap them'
      ? true
      : normalized === 'no-swap' || normalized === 'no swap needed'
        ? false
        : !shouldSwap

  const mistaken = [...(state as number[])]
  if (wrongOperationIsSwap) {
    mistaken[left] = state[right] as number
    mistaken[right] = state[left] as number
  }

  const firstStep: AlgorithmSnapshot = {
    ...currentSnapshot,
    description: wrongOperationIsSwap
      ? `If we swap index ${left} and index ${right}, the array becomes [${mistaken.join(', ')}].`
      : `If we skip this swap, the array stays [${mistaken.join(', ')}] and index ${left} keeps the value ${state[left]}.`,
    dataStructureState: mistaken,
    activeIndices: [left, right],
    comparedIndices: [left, right],
    swappedIndices: wrongOperationIsSwap ? [left, right] : [],
    isPredictionRequired: false,
    criticalJunctionType: null,
    junctionDifficulty: null,
    isFinalStep: false,
  }

  const nextLeft = right
  const nextRight = right + 1
  const hasNextComparison = nextRight < mistaken.length

  const secondStep: AlgorithmSnapshot = hasNextComparison
    ? {
        ...currentSnapshot,
        stepIndex: currentSnapshot.stepIndex + 1,
        description: `On the next comparison, the algorithm compares index ${nextLeft} (value ${mistaken[nextLeft]}) with index ${nextRight} (value ${mistaken[nextRight]}), carrying the consequence of the wrong choice forward.`,
        dataStructureState: mistaken,
        activeIndices: [nextLeft, nextRight],
        comparedIndices: [nextLeft, nextRight],
        swappedIndices: [],
        isPredictionRequired: false,
        criticalJunctionType: null,
        junctionDifficulty: null,
        isFinalStep: false,
      }
    : {
        ...currentSnapshot,
        stepIndex: currentSnapshot.stepIndex + 1,
        description: `The pass ends with the array as [${mistaken.join(', ')}], carrying the consequence of the wrong choice into the next pass.`,
        dataStructureState: mistaken,
        activeIndices: [],
        comparedIndices: [],
        swappedIndices: [],
        isPredictionRequired: false,
        criticalJunctionType: null,
        junctionDifficulty: null,
        isFinalStep: false,
      }

  return [firstStep, secondStep]
}
