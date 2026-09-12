import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface ShellSortState {
  array: number[]
  /** Current gap distance being compared/shifted at. */
  gap: number
  /**
   * Only a true "sorted prefix" once gap reaches 1 (that final pass is
   * exactly an Insertion Sort pass). At larger gaps this just tracks
   * how far the current gap's pass has progressed, for the canvas.
   */
  sortedUpTo: number
  /** Where the key currently sits in the array; -1 when not mid-insertion. */
  keyIndex: number
  /** Which element the key is being compared against; -1 when not comparing. */
  compareIndex: number
}

const PSEUDOCODE_LINE = {
  GAP_INIT: 0,
  WHILE_GAP: 1,
  FOR_I: 2,
  TAKE_KEY: 3,
  COMPARISON: 4,
  SHIFT: 5,
  INSERT: 6,
  GAP_SHRINK: 7,
  DONE: 8,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: ShellSortState
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
 * Pure snapshot engine for Shell Sort: a generalisation of Insertion
 * Sort where each pass compares and shifts elements `gap` positions
 * apart instead of adjacent neighbours. The gap starts at floor(n/2)
 * and halves after each full pass until it reaches 1, at which point
 * the final pass is exactly an Insertion Sort pass over the whole
 * array. Never mutates `input`.
 */
export function shellSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  let gap = Math.floor(n / 2)

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        gap > 0
          ? `Starting Shell Sort. The initial gap is ${gap}: elements ${gap} positions apart are compared and shifted as needed, and the gap shrinks after each full pass.`
          : n === 0
            ? 'The array is empty; there is nothing to sort.'
            : 'A single element is trivially sorted.',
      pseudocodeLine: PSEUDOCODE_LINE.GAP_INIT,
      isPredictionRequired: false,
      state: { array: working, gap, sortedUpTo: 0, keyIndex: -1, compareIndex: -1 },
    }),
  )

  while (gap > 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Starting a pass with gap ${gap}.`,
        pseudocodeLine: PSEUDOCODE_LINE.WHILE_GAP,
        isPredictionRequired: false,
        state: { array: working, gap, sortedUpTo: 0, keyIndex: -1, compareIndex: -1 },
      }),
    )

    for (let i = gap; i < n; i++) {
      const key = working[i]
      let j = i - gap

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Taking the element at index ${i} (value ${key}) to insert into its gap-${gap} sequence.`,
          pseudocodeLine: PSEUDOCODE_LINE.TAKE_KEY,
          isPredictionRequired: false,
          state: { array: working, gap, sortedUpTo: i, keyIndex: i, compareIndex: -1 },
          activeIndices: [i],
        }),
      )

      let keyIndex = i

      while (j >= 0) {
        const compareVal = working[j]
        const shouldShift = key < compareVal

        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `Gap ${gap}: comparing index ${j} (value ${compareVal}) and index ${keyIndex} (value ${key}). Does ${key} shift left?`,
            pseudocodeLine: PSEUDOCODE_LINE.COMPARISON,
            isPredictionRequired: true,
            state: { array: working, gap, sortedUpTo: i, keyIndex, compareIndex: j },
            activeIndices: [keyIndex],
            comparedIndices: [j],
            criticalJunctionType: CriticalJunctionType.GAP_COMPARISON,
            junctionDifficulty: JunctionDifficulty.PROCEDURAL,
          }),
        )

        if (!shouldShift) break

        working[j + gap] = working[j]
        keyIndex = j
        j -= gap

        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `Shifted the value at index ${keyIndex} rightward to index ${keyIndex + gap} to make room for the key. The key is now provisionally at index ${keyIndex}.`,
            pseudocodeLine: PSEUDOCODE_LINE.SHIFT,
            isPredictionRequired: false,
            state: { array: working, gap, sortedUpTo: i, keyIndex, compareIndex: -1 },
            activeIndices: [keyIndex],
          }),
        )
      }

      working[j + gap] = key
      keyIndex = j + gap

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The key (${key}) is now in its correct gap-${gap} position at index ${keyIndex}.`,
          pseudocodeLine: PSEUDOCODE_LINE.INSERT,
          isPredictionRequired: false,
          state: { array: working, gap, sortedUpTo: i + 1, keyIndex: -1, compareIndex: -1 },
        }),
      )
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Pass with gap ${gap} complete. The array is now [${working.join(', ')}].`,
        pseudocodeLine: PSEUDOCODE_LINE.GAP_SHRINK,
        isPredictionRequired: false,
        state: { array: working, gap, sortedUpTo: gap === 1 ? n : 0, keyIndex: -1, compareIndex: -1 },
      }),
    )

    gap = Math.floor(gap / 2)
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'The array is fully sorted. What invariant proves that sorting is complete?',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: true,
      state: { array: working, gap: 0, sortedUpTo: n, keyIndex: -1, compareIndex: -1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Shell Sort complete. The array is fully sorted: [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, gap: 0, sortedUpTo: n, keyIndex: -1, compareIndex: -1 },
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      isFinalStep: true,
    }),
  )

  return snapshots
}
