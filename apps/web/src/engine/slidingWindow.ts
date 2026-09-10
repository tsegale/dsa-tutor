import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface SlidingWindowState {
  array: number[]
  windowStart: number
  windowEnd: number
  windowSum: number
  targetSum: number | null
  bestSum: number | null
  bestStart: number | null
  bestEnd: number | null
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: SlidingWindowState
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
    canvasType: CanvasType.SLIDING_WINDOW,
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

// fixedWindow(arr, k): sum = sum(arr[0..k-1]); for i from k to n-1: sum += arr[i] - arr[i-k]; track max
// variableWindow(arr, target): sum=0, left=0; for right in 0..n-1: sum+=arr[right]; while sum>=target: track min window; sum-=arr[left]; left++
const LINE = { INIT: 0, WINDOW_SUM: 1, SLIDE: 2, CHECK: 3, DONE: 4 } as const

/**
 * Pure snapshot engine for the fixed-size sliding window maximum-sum
 * problem. windowSize is clamped to [1, input.length]. Never mutates
 * `input`.
 */
export function fixedWindowEngine(input: number[], windowSize: number): AlgorithmSnapshot[] {
  const array = [...input]
  const n = array.length
  const k = Math.max(1, Math.min(windowSize, Math.max(1, n)))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (
    start: number,
    end: number,
    sum: number,
    overrides: Partial<SlidingWindowState> = {},
  ): SlidingWindowState => ({
    array,
    windowStart: start,
    windowEnd: end,
    windowSum: sum,
    targetSum: null,
    bestSum: null,
    bestStart: null,
    bestEnd: null,
    ...overrides,
  })

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'The array is empty - there is no window to compute.',
        pseudocodeLine: LINE.INIT,
        isPredictionRequired: false,
        state: baseState(0, -1, 0),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let sum = 0
  for (let i = 0; i < k; i++) sum += array[i]
  let bestSum = sum
  let bestStart = 0
  let bestEnd = k - 1

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The window contains [${array.slice(0, k).join(', ')}]. What is the current window sum?`,
      pseudocodeLine: LINE.WINDOW_SUM,
      isPredictionRequired: true,
      state: baseState(0, k - 1, sum, { bestSum, bestStart, bestEnd }),
      criticalJunctionType: CriticalJunctionType.WINDOW_SUM,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  for (let end = k; end < n; end++) {
    const start = end - k + 1
    const leftVal = array[end - k]
    const rightVal = array[end]

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Sliding forward: we removed ${leftVal} and added ${rightVal}. What is the new window sum?`,
        pseudocodeLine: LINE.SLIDE,
        isPredictionRequired: true,
        state: baseState(start - 1, end - 1, sum, { bestSum, bestStart, bestEnd }),
        criticalJunctionType: CriticalJunctionType.WINDOW_EXPAND,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    sum = sum - leftVal + rightVal
    if (sum > bestSum) {
      bestSum = sum
      bestStart = start
      bestEnd = end
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The window is now [${array.slice(start, end + 1).join(', ')}], sum ${sum}.`,
        pseudocodeLine: LINE.WINDOW_SUM,
        isPredictionRequired: false,
        state: baseState(start, end, sum, { bestSum, bestStart, bestEnd }),
      }),
    )
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The maximum window sum is ${bestSum}, from index ${bestStart} to ${bestEnd}.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: baseState(bestStart, bestEnd, bestSum, { bestSum, bestStart, bestEnd }),
      highlightIndices: Array.from({ length: bestEnd - bestStart + 1 }, (_, i) => bestStart + i),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Pure snapshot engine for the variable-size sliding window smallest-
 * subarray-with-sum->=target problem. Expands from the right, then
 * shrinks from the left while the constraint still holds. Never
 * mutates `input`.
 */
export function variableWindowEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (
    start: number,
    end: number,
    sum: number,
    overrides: Partial<SlidingWindowState> = {},
  ): SlidingWindowState => ({
    array,
    windowStart: start,
    windowEnd: end,
    windowSum: sum,
    targetSum: target,
    bestSum: null,
    bestStart: null,
    bestEnd: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Finding the smallest subarray with a sum >= ${target}. Both pointers start at index 0.`,
      pseudocodeLine: LINE.INIT,
      isPredictionRequired: false,
      state: baseState(0, -1, 0),
    }),
  )

  let left = 0
  let sum = 0
  let bestLength = Infinity
  let bestStart: number | null = null
  let bestEnd: number | null = null

  for (let right = 0; right < n; right++) {
    sum += array[right]

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Current sum is ${sum}. Target is ${target}. Should we expand or shrink the window?`,
        pseudocodeLine: LINE.CHECK,
        isPredictionRequired: true,
        state: baseState(left, right, sum, {
          bestSum: bestStart !== null ? array.slice(bestStart, (bestEnd ?? 0) + 1).reduce((a, b) => a + b, 0) : null,
          bestStart,
          bestEnd,
        }),
        criticalJunctionType: CriticalJunctionType.WINDOW_EXPAND,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    while (sum >= target) {
      if (right - left + 1 < bestLength) {
        bestLength = right - left + 1
        bestStart = left
        bestEnd = right
      }
      sum -= array[left]
      left += 1
    }
  }

  const found = bestStart !== null && bestEnd !== null

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `The smallest subarray with sum >= ${target} is [${array.slice(bestStart!, bestEnd! + 1).join(', ')}], length ${bestLength}.`
        : `No subarray sums to at least ${target}.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: baseState(bestStart ?? left, bestEnd ?? -1, found ? array.slice(bestStart!, bestEnd! + 1).reduce((a, b) => a + b, 0) : 0, {
        bestStart,
        bestEnd,
      }),
      highlightIndices: found ? Array.from({ length: bestEnd! - bestStart! + 1 }, (_, i) => bestStart! + i) : [],
      isFinalStep: true,
    }),
  )

  return snapshots
}
