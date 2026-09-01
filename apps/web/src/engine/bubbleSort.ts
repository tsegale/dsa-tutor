import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

// Matches the pseudocode panel's line numbers, so a snapshot's
// pseudocodeLine tells the UI exactly which line to highlight.
const PSEUDOCODE_LINE = {
  OUTER_LOOP_START: 0,
  INNER_LOOP_START: 1,
  COMPARISON: 2,
  SWAP: 3,
  INNER_LOOP_END: 4,
  OUTER_LOOP_END: 5,
  DONE: 6,
} as const

// A comparison whose values differ by more than this is "obvious": the
// outcome isn't genuinely ambiguous, so pausing for a prediction there
// tests attention span rather than understanding. Critical Junctions
// only interrupt at comparisons where the decision is non-obvious, or
// at the first comparison of a pass (to teach the pass structure).
const OBVIOUS_DIFFERENCE_THRESHOLD = 3

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  dataStructureState: number[]
  activeIndices?: number[]
  highlightIndices?: number[]
  comparedIndices?: number[]
  swappedIndices?: number[]
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
  predictionType?: PredictionType
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    // Bubble Sort's entire prediction interaction is tile selection: two
    // bars pulse on the canvas, the learner reads the values, then picks
    // a tile below. There is no click-to-select-a-bar input path, except
    // at SWAP_DECISION junctions in Code Editor Mode (see codeEditorMode
    // param below), which use CODE_EDITOR instead.
    predictionType: params.predictionType ?? PredictionType.TILE_GRID,
    dataStructureState: [...params.dataStructureState],
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
 * Pure snapshot engine for Bubble Sort. Given an input array, returns
 * the complete, immutable sequence of steps from start to finish.
 * Never mutates `input`; every snapshot's dataStructureState is an
 * independent copy of the array at that instant.
 *
 * codeEditorMode swaps predictionType to CODE_EDITOR on SWAP_DECISION
 * junctions only - the three conceptual junctions (PASS_COMPLETE,
 * EARLY_TERMINATION, ALGORITHM_COMPLETE) always stay TILE_GRID, since
 * Code Editor Mode only applies to the swap execution step.
 */
export function bubbleSortEngine(input: number[], codeEditorMode = false): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let finalized: number[] = []

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        'Starting Bubble Sort. The algorithm will compare adjacent elements and swap them if they are in the wrong order.',
      pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_START,
      isPredictionRequired: false,
      dataStructureState: working,
    }),
  )

  for (let pass = 0; pass < n - 1; pass++) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Starting pass ${pass + 1}: scanning the unsorted portion of the array for adjacent pairs that are out of order.`,
        pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_START,
        isPredictionRequired: false,
        dataStructureState: working,
        highlightIndices: finalized,
      }),
    )

    let swappedThisPass = false
    const lastUnsortedIndex = n - 1 - pass

    for (let i = 0; i < lastUnsortedIndex; i++) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Advancing to index ${i} to compare it with its neighbor at index ${i + 1}.`,
          pseudocodeLine: PSEUDOCODE_LINE.INNER_LOOP_START,
          isPredictionRequired: false,
          dataStructureState: working,
          highlightIndices: finalized,
        }),
      )

      const left = working[i]
      const right = working[i + 1]
      const needsSwap = left > right

      // Critical Junction gating: only pause for a prediction when the
      // decision is genuinely ambiguous (close values) or it's the
      // pass's first comparison (teaches the pass structure). A large,
      // obvious gap skips the prediction and just narrates.
      const isFirstComparisonOfPass = i === 0
      const isAmbiguous = Math.abs(left - right) <= OBVIOUS_DIFFERENCE_THRESHOLD
      const isSwapJunction = isFirstComparisonOfPass || isAmbiguous

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: needsSwap
            ? `Comparing index ${i} (value ${left}) and index ${i + 1} (value ${right}). Since ${left} > ${right}, a swap is needed.`
            : `Comparing index ${i} (value ${left}) and index ${i + 1} (value ${right}). Since ${left} <= ${right}, no swap is needed.`,
          pseudocodeLine: PSEUDOCODE_LINE.COMPARISON,
          isPredictionRequired: isSwapJunction,
          dataStructureState: working,
          activeIndices: [i, i + 1],
          comparedIndices: [i, i + 1],
          highlightIndices: finalized,
          criticalJunctionType: isSwapJunction ? CriticalJunctionType.SWAP_DECISION : null,
          junctionDifficulty: isSwapJunction ? JunctionDifficulty.PROCEDURAL : null,
          predictionType: isSwapJunction && codeEditorMode ? PredictionType.CODE_EDITOR : PredictionType.TILE_GRID,
        }),
      )

      if (needsSwap) {
        working[i] = right
        working[i + 1] = left
        swappedThisPass = true

        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `Swapped index ${i} and index ${i + 1}. The array is now [${working.join(', ')}].`,
            pseudocodeLine: PSEUDOCODE_LINE.SWAP,
            isPredictionRequired: false,
            dataStructureState: working,
            swappedIndices: [i, i + 1],
            highlightIndices: finalized,
          }),
        )
      }

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Finished checking index ${i} and index ${i + 1}.`,
          pseudocodeLine: PSEUDOCODE_LINE.INNER_LOOP_END,
          isPredictionRequired: false,
          dataStructureState: working,
          highlightIndices: finalized,
        }),
      )
    }

    finalized = [lastUnsortedIndex, ...finalized]

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: swappedThisPass
          ? `Pass ${pass + 1} complete. Index ${lastUnsortedIndex} (value ${working[lastUnsortedIndex]}) is now in its final sorted position.`
          : `Pass ${pass + 1} complete with no swaps. The array is already fully sorted.`,
        pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_END,
        isPredictionRequired: false,
        dataStructureState: working,
        highlightIndices: finalized,
      }),
    )

    if (swappedThisPass) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Pass ${pass + 1} is complete. What is now guaranteed about the array?`,
          pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_END,
          isPredictionRequired: true,
          dataStructureState: working,
          highlightIndices: finalized,
          criticalJunctionType: CriticalJunctionType.PASS_COMPLETE,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        }),
      )
    } else {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: 'No swaps occurred during this pass. Why did the algorithm stop early?',
          pseudocodeLine: PSEUDOCODE_LINE.OUTER_LOOP_END,
          isPredictionRequired: true,
          dataStructureState: working,
          highlightIndices: finalized,
          criticalJunctionType: CriticalJunctionType.EARLY_TERMINATION,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        }),
      )
    }

    if (!swappedThisPass) {
      break
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'The array is fully sorted. What invariant proves that sorting is complete?',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: true,
      dataStructureState: working,
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Bubble Sort complete. The array is fully sorted: [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      dataStructureState: working,
      highlightIndices: Array.from({ length: n }, (_, idx) => idx),
      isFinalStep: true,
    }),
  )

  return snapshots
}
