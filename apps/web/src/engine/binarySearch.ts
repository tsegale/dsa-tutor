import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface BinarySearchState {
  array: number[]
  target: number
  low: number
  high: number
  mid: number | null
  found: boolean
  foundIndex: number | null
  /** Indices that have been ruled out by a previous midpoint decision. */
  eliminated: number[]
}

const PSEUDOCODE_LINE = {
  INIT: 0,
  LOOP_CONDITION: 1,
  MIDPOINT: 2,
  FOUND: 3,
  NOT_FOUND: 4,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: BinarySearchState
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
    dataStructureState: { ...params.state, array: [...params.state.array], eliminated: [...params.state.eliminated] },
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
 * Pure snapshot engine for Binary Search. Binary Search only works on a
 * sorted array, so the input is sorted internally before the search
 * begins - the caller never needs to pre-sort it. Never mutates `input`.
 */
export function binarySearchEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input].sort((a, b) => a - b)
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const eliminated: number[] = []

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting Binary Search for target ${target} on the sorted array [${array.join(', ')}]. Binary Search only works on a sorted array: it repeatedly checks the midpoint and eliminates the half that cannot contain the target.`,
      pseudocodeLine: PSEUDOCODE_LINE.INIT,
      isPredictionRequired: false,
      state: { array, target, low: 0, high: n - 1, mid: null, found: false, foundIndex: null, eliminated },
    }),
  )

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so target ${target} was not found.`,
        pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
        isPredictionRequired: false,
        state: { array, target, low: 0, high: -1, mid: null, found: false, foundIndex: null, eliminated },
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let low = 0
  let high = n - 1
  let found = false
  let foundIndex: number | null = null

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = array[mid]

    // Binary Search has few steps overall, so every midpoint comparison
    // is a genuine Critical Junction - unlike Bubble Sort, there is no
    // "obvious difference" filter here.
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Checking midpoint index ${mid} (value ${midVal}) against target ${target}, within the range [${low}, ${high}].`,
        pseudocodeLine: PSEUDOCODE_LINE.MIDPOINT,
        isPredictionRequired: true,
        state: { array, target, low, high, mid, found: false, foundIndex: null, eliminated },
        activeIndices: [mid],
        criticalJunctionType: CriticalJunctionType.MIDPOINT_DECISION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    if (midVal === target) {
      found = true
      foundIndex = mid
      break
    }

    if (target < midVal) {
      for (let i = mid; i <= high; i++) eliminated.push(i)
      high = mid - 1
    } else {
      for (let i = low; i <= mid; i++) eliminated.push(i)
      low = mid + 1
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Binary Search complete. Target ${target} was found at index ${foundIndex}.`
        : `Binary Search complete. Target ${target} was not found in the array.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: true,
      state: { array, target, low, high, mid: foundIndex, found, foundIndex, eliminated },
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
      state: { array, target, low, high, mid: foundIndex, found, foundIndex, eliminated },
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      isFinalStep: true,
    }),
  )

  return snapshots
}
