import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty } from '@dsa-tutor/types'

/**
 * Classifies the pedagogical nature of the decision point a snapshot
 * represents. Bubble Sort's snapshot engine only marks the pairwise
 * comparison step as `isPredictionRequired`, so today every real
 * prediction resolves to SWAP_DECISION (procedural); the other values
 * exist for junctions later algorithms (Phase 16+) will introduce.
 */
export function classifyCriticalJunction(snapshot: AlgorithmSnapshot): CriticalJunctionType {
  if (snapshot.isFinalStep) return CriticalJunctionType.ALGORITHM_COMPLETE
  if (snapshot.comparedIndices.length === 2) return CriticalJunctionType.SWAP_DECISION
  return CriticalJunctionType.PASS_COMPLETE
}

export function isConceptualJunction(junctionType: CriticalJunctionType): boolean {
  return junctionType !== CriticalJunctionType.SWAP_DECISION
}

/**
 * A comparison between near-equal values is easier to mis-judge than one
 * between clearly separated values, so difficulty is derived from how
 * close the two compared values are.
 */
export function classifyJunctionDifficulty(snapshot: AlgorithmSnapshot): JunctionDifficulty {
  const state = snapshot.dataStructureState
  if (snapshot.comparedIndices.length !== 2 || !Array.isArray(state)) {
    return JunctionDifficulty.MEDIUM
  }

  const [left, right] = snapshot.comparedIndices
  const diff = Math.abs(Number(state[left]) - Number(state[right]))

  if (diff <= 1) return JunctionDifficulty.HARD
  if (diff <= 3) return JunctionDifficulty.MEDIUM
  return JunctionDifficulty.EASY
}

/**
 * For HIGH-scaffolding tile priming only: the swap/no-swap option a
 * TILE_GRID prompt should lightly highlight after inactivity. Never used
 * for grading, which stays server-side.
 */
export function getExpectedSwapOptionId(snapshot: AlgorithmSnapshot): 'swap' | 'no-swap' | null {
  const state = snapshot.dataStructureState
  if (snapshot.activeIndices.length !== 2 || !Array.isArray(state)) return null

  const [left, right] = snapshot.activeIndices
  const leftValue = Number(state[left])
  const rightValue = Number(state[right])
  if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) return null

  return leftValue > rightValue ? 'swap' : 'no-swap'
}

/** LOW scaffolding shows a one-sentence mistake analysis only. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : text.trim()
}
