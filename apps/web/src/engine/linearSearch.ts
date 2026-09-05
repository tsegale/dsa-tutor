import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface LinearSearchState {
  array: number[]
  target: number
  currentIndex: number
  found: boolean
  foundIndex: number | null
}

const PSEUDOCODE_LINE = {
  LOOP_START: 0,
  CHECK: 1,
  FOUND: 2,
  CONTINUE: 3,
  NOT_FOUND: 4,
} as const

// Prompting on every single index would fatigue the learner; a
// prediction is only worth pausing for when the current element
// actually matches the target (the moment that matters most), or every
// third index otherwise, to keep engagement without nagging.
const ENGAGEMENT_CHECKPOINT_INTERVAL = 3

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: LinearSearchState
  activeIndices?: number[]
  highlightIndices?: number[]
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for Linear Search. Given an input array and a
 * target value, returns the complete, immutable sequence of steps
 * scanning from left to right until a match is found or the array is
 * exhausted. Never mutates `input`.
 */
export function linearSearchEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting Linear Search for target ${target}. The algorithm checks each element from left to right until it finds a match or reaches the end.`,
      pseudocodeLine: PSEUDOCODE_LINE.LOOP_START,
      isPredictionRequired: false,
      state: { array, target, currentIndex: -1, found: false, foundIndex: null },
    }),
  )

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so target ${target} was not found.`,
        pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
        isPredictionRequired: false,
        state: { array, target, currentIndex: -1, found: false, foundIndex: null },
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let found = false
  let foundIndex: number | null = null

  for (let i = 0; i < n; i++) {
    const value = array[i]
    const isMatch = value === target
    const isEngagementCheckpoint = i % ENGAGEMENT_CHECKPOINT_INTERVAL === 0
    const shouldPrompt = isMatch || isEngagementCheckpoint

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Checking index ${i} (value ${value}) against the target ${target}.`,
        pseudocodeLine: PSEUDOCODE_LINE.CHECK,
        isPredictionRequired: shouldPrompt,
        state: { array, target, currentIndex: i, found: false, foundIndex: null },
        activeIndices: [i],
        criticalJunctionType: shouldPrompt ? CriticalJunctionType.TARGET_CHECK : null,
        junctionDifficulty: shouldPrompt ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )

    if (isMatch) {
      found = true
      foundIndex = i
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Found target ${target} at index ${i}.`,
          pseudocodeLine: PSEUDOCODE_LINE.FOUND,
          isPredictionRequired: false,
          state: { array, target, currentIndex: i, found: true, foundIndex: i },
          highlightIndices: [i],
        }),
      )
      break
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Linear Search complete. Target ${target} was found at index ${foundIndex}.`
        : `Linear Search complete. Target ${target} was not found in the array.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: true,
      state: { array, target, currentIndex: n - 1, found, foundIndex },
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Search complete: [${array.join(', ')}] contains ${target} at index ${foundIndex}.`
        : `Search complete: [${array.join(', ')}] does not contain ${target}.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: false,
      state: { array, target, currentIndex: n - 1, found, foundIndex },
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      isFinalStep: true,
    }),
  )

  return snapshots
}
