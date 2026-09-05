import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface SelectionSortState {
  array: number[]
  /** Everything before this index is sorted. */
  sortedUpTo: number
  /** Index of the current minimum found so far in this pass. */
  currentMin: number
  /** Index currently being scanned. */
  scanIndex: number
}

const PSEUDOCODE_LINE = {
  OUTER_LOOP_START: 0,
  INNER_LOOP_START: 1,
  COMPARISON: 2,
  UPDATE_MIN: 3,
  INNER_LOOP_END: 4,
  SWAP: 5,
  DONE: 6,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: SelectionSortState
  activeIndices?: number[]
  highlightIndices?: number[]
  comparedIndices?: number[]
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
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [...(params.comparedIndices ?? [])],
    swappedIndices: [...(params.swappedIndices ?? [])],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for Selection Sort. On each pass, scans the
 * unsorted region for its minimum element and swaps it to the front of
 * that region - fundamentally different from Bubble Sort's adjacent
 * swaps. Never mutates `input`.
 */
export function selectionSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        'Starting Selection Sort. On each pass, the algorithm finds the minimum element in the unsorted region and swaps it to the front of that region.',
      pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_START,
      isPredictionRequired: false,
      state: { array: working, sortedUpTo: 0, currentMin: 0, scanIndex: 0 },
    }),
  )

  for (let i = 0; i < n - 1; i++) {
    let currentMin = i

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Starting a new pass. Scanning from index ${i} to find the minimum element in the unsorted region.`,
        pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_START,
        isPredictionRequired: false,
        state: { array: working, sortedUpTo: i, currentMin, scanIndex: i },
        highlightIndices: Array.from({ length: i }, (_, idx) => idx),
        activeIndices: [currentMin],
      }),
    )

    for (let j = i + 1; j < n; j++) {
      const isNewMin = working[j] < working[currentMin]

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Comparing index ${j} (value ${working[j]}) against the current minimum at index ${currentMin} (value ${working[currentMin]}).`,
          pseudocodeLine: PSEUDOCODE_LINE.COMPARISON,
          // Only worth pausing for when a new minimum is actually found -
          // a scan step that merely confirms the existing minimum stays
          // narration-only, not a Critical Junction.
          isPredictionRequired: isNewMin,
          state: { array: working, sortedUpTo: i, currentMin, scanIndex: j },
          activeIndices: [currentMin],
          comparedIndices: [j],
          highlightIndices: Array.from({ length: i }, (_, idx) => idx),
          criticalJunctionType: isNewMin ? CriticalJunctionType.NEW_MINIMUM : null,
          junctionDifficulty: isNewMin ? JunctionDifficulty.PROCEDURAL : null,
        }),
      )

      if (isNewMin) {
        currentMin = j
        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `New minimum found at index ${currentMin} (value ${working[currentMin]}).`,
            pseudocodeLine: PSEUDOCODE_LINE.UPDATE_MIN,
            isPredictionRequired: false,
            state: { array: working, sortedUpTo: i, currentMin, scanIndex: j },
            activeIndices: [currentMin],
            highlightIndices: Array.from({ length: i }, (_, idx) => idx),
          }),
        )
      }
    }

    if (currentMin !== i) {
      const temp = working[i]
      working[i] = working[currentMin]
      working[currentMin] = temp
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description:
          currentMin !== i
            ? `Pass complete. Swapped the minimum into index ${i}. The array is now [${working.join(', ')}].`
            : `Pass complete. Index ${i} already held the minimum, so no swap was needed.`,
        pseudocodeLine: PSEUDOCODE_LINE.SWAP,
        isPredictionRequired: false,
        state: { array: working, sortedUpTo: i + 1, currentMin: i, scanIndex: i },
        highlightIndices: Array.from({ length: i + 1 }, (_, idx) => idx),
        // The reference algorithm calls swap(arr[i], arr[min_idx])
        // unconditionally every pass - a no-op when min_idx already
        // equals i, but still counted as one of the n-1 swaps.
        swappedIndices: [i, currentMin],
      }),
    )

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'What happens when the scan pass is complete?',
        pseudocodeLine: PSEUDOCODE_LINE.INNER_LOOP_END,
        isPredictionRequired: true,
        state: { array: working, sortedUpTo: i + 1, currentMin: i, scanIndex: i },
        highlightIndices: Array.from({ length: i + 1 }, (_, idx) => idx),
        criticalJunctionType: CriticalJunctionType.PASS_COMPLETE,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      }),
    )
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'The array is fully sorted. What invariant proves that sorting is complete?',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: true,
      state: { array: working, sortedUpTo: n, currentMin: n - 1, scanIndex: n - 1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Selection Sort complete. The array is fully sorted: [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, sortedUpTo: n, currentMin: n - 1, scanIndex: n - 1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      isFinalStep: true,
    }),
  )

  return snapshots
}
