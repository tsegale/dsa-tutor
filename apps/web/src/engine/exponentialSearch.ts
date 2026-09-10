import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface ExponentialSearchState {
  array: number[]
  target: number
  bound: number
  low: number
  high: number
  mid: number | null
  phase: 'doubling' | 'binary'
  found: boolean
  foundIndex: number | null
}

const PSEUDOCODE_LINE = { CHECK_FIRST: 0, DOUBLE: 1, BINARY_SEARCH: 2, FOUND: 3, NOT_FOUND: 4 } as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: ExponentialSearchState
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
    canvasType: CanvasType.ARRAY,
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
 * Pure snapshot engine for Exponential Search. Requires a sorted array
 * (sorted internally). Doubles a bound (1, 2, 4, 8...) until arr[bound]
 * >= target or the bound exceeds the array, then binary searches within
 * [bound/2, bound]. Never mutates `input`.
 */
export function exponentialSearchEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input].sort((a, b) => a - b)
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (overrides: Partial<ExponentialSearchState> = {}): ExponentialSearchState => ({
    array,
    target,
    bound: 1,
    low: 0,
    high: n - 1,
    mid: null,
    phase: 'doubling',
    found: false,
    foundIndex: null,
    ...overrides,
  })

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so target ${target} was not found.`,
        pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
        isPredictionRequired: false,
        state: baseState({ high: -1 }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Checking index 0 (value ${array[0]}) first, since exponential search always starts there.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_FIRST,
      isPredictionRequired: false,
      state: baseState(),
      activeIndices: [0],
    }),
  )

  if (array[0] === target) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Exponential Search complete. Target ${target} was found at index 0.`,
        pseudocodeLine: PSEUDOCODE_LINE.FOUND,
        isPredictionRequired: false,
        state: baseState({ found: true, foundIndex: 0 }),
        highlightIndices: [0],
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let bound = 1
  while (bound < n && array[bound] < target) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `arr[${bound}] = ${array[bound]}. Should we double the range?`,
        pseudocodeLine: PSEUDOCODE_LINE.DOUBLE,
        isPredictionRequired: true,
        state: baseState({ bound }),
        activeIndices: [bound],
        criticalJunctionType: CriticalJunctionType.RANGE_DOUBLE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    bound *= 2
  }

  const low = Math.floor(bound / 2)
  const high = Math.min(bound, n - 1)

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The range is now [${low}, ${high}]. Switching to Binary Search within this range.`,
      pseudocodeLine: PSEUDOCODE_LINE.BINARY_SEARCH,
      isPredictionRequired: false,
      state: baseState({ bound, low, high, phase: 'binary' }),
    }),
  )

  let searchLow = low
  let searchHigh = high
  let found = false
  let foundIndex: number | null = null

  while (searchLow <= searchHigh) {
    const mid = Math.floor((searchLow + searchHigh) / 2)
    const midVal = array[mid]

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Checking midpoint index ${mid} (value ${midVal}) against target ${target}, within the range [${searchLow}, ${searchHigh}].`,
        pseudocodeLine: PSEUDOCODE_LINE.BINARY_SEARCH,
        isPredictionRequired: true,
        state: baseState({ bound, low: searchLow, high: searchHigh, mid, phase: 'binary' }),
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
      searchHigh = mid - 1
    } else {
      searchLow = mid + 1
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Exponential Search complete. Target ${target} was found at index ${foundIndex}.`
        : `Exponential Search complete. Target ${target} was not found in the array.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: true,
      state: baseState({ bound, low: searchLow, high: searchHigh, phase: 'binary', found, foundIndex }),
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}
