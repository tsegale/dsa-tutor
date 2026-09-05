import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface QuickSortState {
  array: number[]
  pivotIndex: number
  pivotValue: number
  leftPointer: number
  rightPointer: number
  /** [low, high] of the current active partition. */
  partitionRange: [number, number]
  /** Indices that are in their final sorted position. */
  sortedIndices: number[]
}

const PSEUDOCODE_LINE = {
  PARTITION_START: 0,
  CHOOSE_PIVOT: 1,
  COMPARE: 2,
  SWAP: 3,
  PLACE_PIVOT: 4,
  DONE: 5,
} as const

// Every comparison shown would fatigue the learner for larger inputs;
// only every third comparison is genuinely paused on.
const PARTITION_PROMPT_INTERVAL = 3

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: QuickSortState
  activeIndices?: number[]
  comparedIndices?: number[]
  highlightIndices?: number[]
  swappedIndices?: number[]
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
    dataStructureState: { ...params.state, array: [...params.state.array], sortedIndices: [...params.state.sortedIndices] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [...(params.comparedIndices ?? [])],
    // The pivot stays purple for the entire partition operation (not
    // just an instantaneous swap flash), reusing swappedIndices - the
    // one existing field the canvas already renders as purple - as a
    // persistent pivot marker rather than a one-step swap event.
    swappedIndices: [...(params.swappedIndices ?? [])],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for an iterative Quick Sort using an explicit
 * stack to simulate recursion (so the snapshot sequence is linear, no
 * recursion-stack state for the canvas to reconstruct) and the Lomuto
 * partition scheme (last element of each partition is the pivot).
 * Never mutates `input`.
 */
export function quickSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const sortedIndices: number[] = []
  let comparisonCount = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  push({
    description:
      'Starting Quick Sort. Each partition picks its last element as the pivot, then rearranges elements so everything smaller than the pivot ends up to its left and everything larger ends up to its right.',
    pseudocodeLine: PSEUDOCODE_LINE.PARTITION_START,
    isPredictionRequired: false,
    state: { array: working, pivotIndex: -1, pivotValue: 0, leftPointer: -1, rightPointer: -1, partitionRange: [0, Math.max(0, n - 1)], sortedIndices },
  })

  if (n <= 1) {
    if (n === 1) sortedIndices.push(0)
    push({
      description: n === 0 ? 'The array is empty; there is nothing to sort.' : 'A single element is trivially sorted.',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, pivotIndex: -1, pivotValue: 0, leftPointer: -1, rightPointer: -1, partitionRange: [0, Math.max(0, n - 1)], sortedIndices },
      highlightIndices: [...sortedIndices],
      isFinalStep: true,
    })
    return snapshots
  }

  const stack: [number, number][] = [[0, n - 1]]

  while (stack.length > 0) {
    const [low, high] = stack.pop()!

    if (low >= high) {
      if (low === high) sortedIndices.push(low)
      continue
    }

    const pivotValue = working[high]

    push({
      description: `Choosing the last element of range [${low}, ${high}] (value ${pivotValue}) as the pivot.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHOOSE_PIVOT,
      isPredictionRequired: false,
      state: { array: working, pivotIndex: high, pivotValue, leftPointer: low, rightPointer: high, partitionRange: [low, high], sortedIndices },
      swappedIndices: [high],
      highlightIndices: [...sortedIndices],
      criticalJunctionType: CriticalJunctionType.PIVOT_SELECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    let boundary = low - 1

    for (let j = low; j < high; j++) {
      comparisonCount++
      const shouldPrompt = comparisonCount % PARTITION_PROMPT_INTERVAL === 0
      const belongsLeft = working[j] < pivotValue

      push({
        description: `Comparing index ${j} (value ${working[j]}) with the pivot ${pivotValue}. What happens next?`,
        pseudocodeLine: PSEUDOCODE_LINE.COMPARE,
        isPredictionRequired: shouldPrompt,
        state: { array: working, pivotIndex: high, pivotValue, leftPointer: j, rightPointer: high, partitionRange: [low, high], sortedIndices },
        activeIndices: [j],
        comparedIndices: [high],
        swappedIndices: [high],
        highlightIndices: [...sortedIndices],
        criticalJunctionType: shouldPrompt ? CriticalJunctionType.PARTITION_DECISION : null,
        junctionDifficulty: shouldPrompt ? JunctionDifficulty.PROCEDURAL : null,
      })

      if (belongsLeft) {
        boundary++
        if (boundary !== j) {
          const temp = working[boundary]
          working[boundary] = working[j]
          working[j] = temp
        }
        push({
          description: `${working[boundary]} belongs left of the pivot; moved to index ${boundary}.`,
          pseudocodeLine: PSEUDOCODE_LINE.SWAP,
          isPredictionRequired: false,
          state: { array: working, pivotIndex: high, pivotValue, leftPointer: boundary, rightPointer: high, partitionRange: [low, high], sortedIndices },
          swappedIndices: [high],
          highlightIndices: [...sortedIndices],
        })
      }
    }

    const pivotFinalIndex = boundary + 1
    if (pivotFinalIndex !== high) {
      const temp = working[pivotFinalIndex]
      working[pivotFinalIndex] = working[high]
      working[high] = temp
    }
    sortedIndices.push(pivotFinalIndex)

    push({
      description: `Pivot ${pivotValue} placed at index ${pivotFinalIndex}, its final sorted position.`,
      pseudocodeLine: PSEUDOCODE_LINE.PLACE_PIVOT,
      isPredictionRequired: false,
      state: { array: working, pivotIndex: pivotFinalIndex, pivotValue, leftPointer: -1, rightPointer: -1, partitionRange: [low, high], sortedIndices },
      highlightIndices: [...sortedIndices],
    })

    stack.push([low, pivotFinalIndex - 1])
    stack.push([pivotFinalIndex + 1, high])
  }

  push({
    description: 'The array is fully sorted. What invariant proves that sorting is complete?',
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: true,
    state: { array: working, pivotIndex: -1, pivotValue: 0, leftPointer: -1, rightPointer: -1, partitionRange: [0, n - 1], sortedIndices },
    highlightIndices: [...sortedIndices],
    criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  })

  push({
    description: `Quick Sort complete. The array is fully sorted: [${working.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { array: working, pivotIndex: -1, pivotValue: 0, leftPointer: -1, rightPointer: -1, partitionRange: [0, n - 1], sortedIndices },
    highlightIndices: [...sortedIndices],
    isFinalStep: true,
  })

  return snapshots
}
