import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import { shouldForceJunction } from '../utils/junctionTargeting'

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
//
// The threshold scales with the array's own value range rather than
// using a fixed number: a fixed threshold of 3 flags every comparison
// in a tightly-clustered array like [1,2,3,4,5] as "ambiguous" (adjacent
// gaps are always 1), causing a prediction on every single comparison,
// while the same threshold almost never fires on a widely-spread array
// like [100,97,3,1] even when two values are proportionally very close.
// A tenth of the array's own spread judges "close" relative to that
// array instead of against an arbitrary absolute number.
const AMBIGUITY_RANGE_RATIO = 0.1

function computeAmbiguityThreshold(array: number[]): number {
  if (array.length === 0) return 0
  const range = Math.max(...array) - Math.min(...array)
  return Math.round(range * AMBIGUITY_RANGE_RATIO)
}

/**
 * How often procedural (non-conceptual) junctions pause for a prediction,
 * independent of how much support is shown once they do. Conceptual
 * junctions (PASS_COMPLETE, EARLY_TERMINATION, ALGORITHM_COMPLETE) always
 * fire regardless of density - fading applies only to the repeated,
 * potentially fatiguing per-comparison decisions.
 * - ALL: every comparison is a junction.
 * - STANDARD (default): the first comparison of each pass, plus any
 *   comparison whose values are genuinely close (see computeAmbiguityThreshold).
 *   This is the pre-existing behaviour, kept as the default so callers that
 *   don't pass an option see no change.
 * - SPARSE: only the first comparison of each pass - enough to keep teaching
 *   the pass structure without pausing on every close-but-not-ambiguous gap.
 */
export type JunctionDensity = 'ALL' | 'STANDARD' | 'SPARSE'

export interface BubbleSortOptions {
  codeEditorMode?: boolean
  junctionDensity?: JunctionDensity
  /** The learner's most frequent recent misconception category (see
   * utils/junctionTargeting.ts's topMisconceptionOf). When it targets
   * SWAP_DECISION, that junction fires even if density gating would
   * have skipped it - fading should never skip past the learner's
   * actual weak spot. */
  topMisconception?: string | null
}

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
export function bubbleSortEngine(input: number[], options: BubbleSortOptions = {}): AlgorithmSnapshot[] {
  const { codeEditorMode = false, junctionDensity = 'STANDARD', topMisconception = null } = options
  const working = [...input]
  const n = working.length
  const ambiguityThreshold = computeAmbiguityThreshold(working)
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
      // obvious gap skips the prediction and just narrates. junctionDensity
      // scales how readily that gate opens - see the JunctionDensity doc
      // comment above for what each level means.
      const isFirstComparisonOfPass = i === 0
      const isAmbiguous = Math.abs(left - right) <= ambiguityThreshold
      const densityWantsJunction =
        junctionDensity === 'ALL'
          ? true
          : junctionDensity === 'SPARSE'
            ? isFirstComparisonOfPass
            : isFirstComparisonOfPass || isAmbiguous
      const isSwapJunction =
        densityWantsJunction || shouldForceJunction(topMisconception, CriticalJunctionType.SWAP_DECISION)

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          // Observable facts only - the outcome (whether a swap is needed)
          // is exactly what the prediction below asks the student, so it
          // must not appear here. See the SWAP and INNER_LOOP_END snapshots
          // for where that reasoning is narrated, after the student answers.
          description: `Comparing index ${i} (value ${left}) and index ${i + 1} (value ${right}).`,
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
            description: `Since ${left} > ${right}, a swap is needed. Swapped index ${i} and index ${i + 1}. The array is now [${working.join(', ')}].`,
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
          description: needsSwap
            ? `Finished checking index ${i} and index ${i + 1}.`
            : `Since ${left} <= ${right}, no swap is needed. Finished checking index ${i} and index ${i + 1}.`,
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
