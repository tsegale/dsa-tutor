import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface InsertionSortState {
  array: number[]
  /** Everything up to this index is sorted. */
  sortedUpTo: number
  /** The value being inserted (not an index). */
  currentKey: number
  /** Where the key currently sits in the array. */
  keyIndex: number
  /** Which element the key is currently being compared against. */
  compareIndex: number
}

const PSEUDOCODE_LINE = {
  OUTER_LOOP_START: 0,
  TAKE_KEY: 1,
  COMPARISON: 2,
  SHIFT: 3,
  INSERT: 4,
  DONE: 5,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: InsertionSortState
  activeIndices?: number[]
  highlightIndices?: number[]
  comparedIndices?: number[]
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
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for Insertion Sort. Builds a sorted region from
 * left to right: each new "key" element shifts elements in the sorted
 * region rightward until it finds its correct position. Never mutates
 * `input`.
 */
export function insertionSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        'Starting Insertion Sort. Each element is taken as a key and shifted into its correct position within the already-sorted region to its left.',
      pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_START,
      isPredictionRequired: false,
      state: { array: working, sortedUpTo: Math.min(1, n), currentKey: working[0] ?? 0, keyIndex: 0, compareIndex: -1 },
      highlightIndices: n > 0 ? [0] : [],
    }),
  )

  for (let i = 1; i < n; i++) {
    const key = working[i]
    let j = i - 1

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Taking the element at index ${i} (value ${key}) as the key to insert into the sorted region.`,
        pseudocodeLine: PSEUDOCODE_LINE.TAKE_KEY,
        isPredictionRequired: false,
        state: { array: working, sortedUpTo: i, currentKey: key, keyIndex: i, compareIndex: j },
        activeIndices: [i],
        highlightIndices: Array.from({ length: i }, (_, idx) => idx),
      }),
    )

    let keyIndex = i

    while (j >= 0) {
      const compareVal = working[j]
      const shouldShift = key < compareVal

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The algorithm is comparing the key (${key}) with the element at index ${j} (value ${compareVal}).`,
          pseudocodeLine: PSEUDOCODE_LINE.COMPARISON,
          isPredictionRequired: true,
          state: { array: working, sortedUpTo: i, currentKey: key, keyIndex, compareIndex: j },
          activeIndices: [keyIndex],
          comparedIndices: [j],
          highlightIndices: Array.from({ length: i }, (_, idx) => idx),
          criticalJunctionType: CriticalJunctionType.SWAP_DECISION,
          junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        }),
      )

      if (!shouldShift) break

      working[j + 1] = working[j]
      keyIndex = j
      j--

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Shifted the value at index ${j + 1} rightward to make room for the key. The key is now provisionally at index ${keyIndex}.`,
          pseudocodeLine: PSEUDOCODE_LINE.SHIFT,
          isPredictionRequired: false,
          state: { array: working, sortedUpTo: i, currentKey: key, keyIndex, compareIndex: j },
          activeIndices: [keyIndex],
          highlightIndices: Array.from({ length: i }, (_, idx) => idx),
        }),
      )
    }

    working[j + 1] = key
    keyIndex = j + 1

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The key (${key}) is now in its correct position at index ${keyIndex}. The sorted region now extends to index ${i}.`,
        pseudocodeLine: PSEUDOCODE_LINE.INSERT,
        isPredictionRequired: false,
        state: { array: working, sortedUpTo: i + 1, currentKey: key, keyIndex, compareIndex: j },
        highlightIndices: Array.from({ length: i + 1 }, (_, idx) => idx),
      }),
    )

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'The key has reached its final position. What is now guaranteed about the array?',
        pseudocodeLine: PSEUDOCODE_LINE.INSERT,
        isPredictionRequired: true,
        state: { array: working, sortedUpTo: i + 1, currentKey: key, keyIndex, compareIndex: j },
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
      state: { array: working, sortedUpTo: n, currentKey: working[n - 1] ?? 0, keyIndex: n - 1, compareIndex: -1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Insertion Sort complete. The array is fully sorted: [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, sortedUpTo: n, currentKey: working[n - 1] ?? 0, keyIndex: n - 1, compareIndex: -1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      isFinalStep: true,
    }),
  )

  return snapshots
}
