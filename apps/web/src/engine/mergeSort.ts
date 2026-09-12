import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface MergeSortState {
  array: number[]
  /** [start, end] of the left sub-array currently being merged. */
  leftRegion: [number, number]
  /** [start, end] of the right sub-array currently being merged. */
  rightRegion: [number, number]
  /** [start, end] of the region just completed. */
  mergedRegion: [number, number]
  phase: 'dividing' | 'merging' | 'complete'
  /** Current sub-array size for this pass (1, 2, 4, 8...). */
  passSize: number
}

const PSEUDOCODE_LINE = {
  PASS_START: 0,
  MERGE_START: 1,
  COMPARE: 2,
  PLACE: 3,
  PASS_END: 4,
  DONE: 5,
} as const

function range(start: number, end: number): number[] {
  if (end < start) return []
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: MergeSortState
  activeIndices?: number[]
  comparedIndices?: number[]
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
    comparedIndices: [...(params.comparedIndices ?? [])],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for an iterative, bottom-up Merge Sort. Starts
 * with sub-arrays of size 1 and repeatedly merges adjacent pairs into
 * double-sized sorted runs until the whole array is one sorted run.
 * Chosen over top-down recursion so the snapshot sequence is linear -
 * no recursion-stack state for the canvas to reconstruct. Never
 * mutates `input`; stable (equal elements preserve relative order,
 * since the merge step always prefers the left element on a tie).
 */
export function mergeSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  push({
    description:
      'Starting Merge Sort (bottom-up). The array is treated as n sub-arrays of size 1, which are repeatedly merged in pairs into progressively larger sorted runs.',
    pseudocodeLine: PSEUDOCODE_LINE.PASS_START,
    isPredictionRequired: false,
    state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, 0], phase: 'dividing', passSize: 1 },
  })

  if (n <= 1) {
    push({
      description: n === 0 ? 'The array is empty; there is nothing to sort.' : 'A single element is trivially sorted.',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, Math.max(0, n - 1)], phase: 'complete', passSize: 1 },
      highlightIndices: range(0, n - 1),
      isFinalStep: true,
    })
    return snapshots
  }

  let passSize = 1

  while (passSize < n) {
    push({
      description: `Starting a pass: merging sorted sub-arrays of size ${passSize} into sorted sub-arrays of size ${Math.min(passSize * 2, n)}.`,
      pseudocodeLine: PSEUDOCODE_LINE.PASS_START,
      isPredictionRequired: false,
      state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, 0], phase: 'dividing', passSize },
    })

    for (let start = 0; start < n; start += 2 * passSize) {
      const leftStart = start
      const leftEnd = Math.min(start + passSize, n) - 1
      const rightStart = Math.min(start + passSize, n)
      const rightEnd = Math.min(start + 2 * passSize, n) - 1

      if (rightStart > rightEnd) {
        // No pairing partner this pass (odd leftover run) - it carries
        // forward unchanged, no merge decision to make.
        push({
          description: `The sub-array [${leftStart}, ${leftEnd}] has no pair this pass and carries forward unchanged.`,
          pseudocodeLine: PSEUDOCODE_LINE.MERGE_START,
          isPredictionRequired: false,
          state: { array: working, leftRegion: [leftStart, leftEnd], rightRegion: [rightStart, rightStart], mergedRegion: [leftStart, leftEnd], phase: 'merging', passSize },
          highlightIndices: range(leftStart, leftEnd),
        })
        continue
      }

      const leftArr = working.slice(leftStart, leftEnd + 1)
      const rightArr = working.slice(rightStart, rightEnd + 1)
      let i = 0
      let j = 0
      let k = leftStart
      let isFirstComparison = true

      push({
        description: `Merging [${leftArr.join(', ')}] with [${rightArr.join(', ')}].`,
        pseudocodeLine: PSEUDOCODE_LINE.MERGE_START,
        isPredictionRequired: false,
        state: { array: working, leftRegion: [leftStart, leftEnd], rightRegion: [rightStart, rightEnd], mergedRegion: [leftStart, leftStart - 1], phase: 'merging', passSize },
        activeIndices: range(leftStart, leftEnd),
        comparedIndices: range(rightStart, rightEnd),
      })

      while (i < leftArr.length && j < rightArr.length) {
        const leftVal = leftArr[i]
        const rightVal = rightArr[j]
        const takeLeft = leftVal <= rightVal

        // Only the FIRST comparison of this merge is a Critical
        // Junction - every subsequent take is narration-only, so the
        // learner isn't asked to re-predict an operation they've
        // already reasoned through for this pair of runs.
        if (isFirstComparison) {
          push({
            description: `Comparing ${leftVal} (left run) with ${rightVal} (right run). Which goes into the merged result first?`,
            pseudocodeLine: PSEUDOCODE_LINE.COMPARE,
            isPredictionRequired: true,
            state: { array: working, leftRegion: [leftStart + i, leftEnd], rightRegion: [rightStart + j, rightEnd], mergedRegion: [leftStart, k - 1], phase: 'merging', passSize },
            activeIndices: range(leftStart + i, leftEnd),
            comparedIndices: range(rightStart + j, rightEnd),
            highlightIndices: range(leftStart, k - 1),
            criticalJunctionType: CriticalJunctionType.MERGE_DECISION,
            junctionDifficulty: JunctionDifficulty.PROCEDURAL,
          })
          isFirstComparison = false
        }

        if (takeLeft) {
          working[k] = leftVal
          i++
        } else {
          working[k] = rightVal
          j++
        }
        k++

        push({
          description: `Placed ${takeLeft ? leftVal : rightVal} at index ${k - 1}.`,
          pseudocodeLine: PSEUDOCODE_LINE.PLACE,
          isPredictionRequired: false,
          state: { array: working, leftRegion: [leftStart + i, leftEnd], rightRegion: [rightStart + j, rightEnd], mergedRegion: [leftStart, k - 1], phase: 'merging', passSize },
          activeIndices: range(leftStart + i, leftEnd),
          comparedIndices: range(rightStart + j, rightEnd),
          highlightIndices: range(leftStart, k - 1),
        })
      }

      while (i < leftArr.length) {
        working[k] = leftArr[i]
        i++
        k++
        push({
          description: `Remaining left-run element ${working[k - 1]} copied to index ${k - 1}.`,
          pseudocodeLine: PSEUDOCODE_LINE.PLACE,
          isPredictionRequired: false,
          state: { array: working, leftRegion: [leftStart + i, leftEnd], rightRegion: [rightEnd + 1, rightEnd], mergedRegion: [leftStart, k - 1], phase: 'merging', passSize },
          highlightIndices: range(leftStart, k - 1),
        })
      }

      while (j < rightArr.length) {
        working[k] = rightArr[j]
        j++
        k++
        push({
          description: `Remaining right-run element ${working[k - 1]} copied to index ${k - 1}.`,
          pseudocodeLine: PSEUDOCODE_LINE.PLACE,
          isPredictionRequired: false,
          state: { array: working, leftRegion: [leftEnd + 1, leftEnd], rightRegion: [rightStart + j, rightEnd], mergedRegion: [leftStart, k - 1], phase: 'merging', passSize },
          highlightIndices: range(leftStart, k - 1),
        })
      }
    }

    push({
      description: 'What is guaranteed about the merged regions?',
      pseudocodeLine: PSEUDOCODE_LINE.PASS_END,
      isPredictionRequired: true,
      state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, n - 1], phase: 'merging', passSize },
      criticalJunctionType: CriticalJunctionType.PASS_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    passSize *= 2
  }

  push({
    description: 'The array is fully sorted. What invariant proves that sorting is complete?',
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: true,
    state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, n - 1], phase: 'complete', passSize },
    highlightIndices: range(0, n - 1),
    criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  })

  push({
    description: `Merge Sort complete. The array is fully sorted: [${working.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { array: working, leftRegion: [0, 0], rightRegion: [0, 0], mergedRegion: [0, n - 1], phase: 'complete', passSize },
    highlightIndices: range(0, n - 1),
    isFinalStep: true,
  })

  return snapshots
}
