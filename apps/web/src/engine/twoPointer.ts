import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface TwoPointerState {
  array: (number | string)[]
  target: number | null
  leftPointerIndex: number
  rightPointerIndex: number
  currentSum: number | null
  found: boolean
  foundPair: [number, number] | null
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: TwoPointerState
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
    activeIndices: [],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

// twoSum(arr, target): L=0, R=n-1; while L<R: sum=arr[L]+arr[R]; if sum==target: found; elif sum<target: L++; else: R--
// palindrome(arr): L=0, R=n-1; while L<R: if arr[L]!=arr[R]: not a palindrome; L++; R--
const LINE = { INIT: 0, COMPARE: 1, MOVE_LEFT: 2, MOVE_RIGHT: 3, DONE: 4 } as const

/**
 * Pure snapshot engine for the classic sorted two-sum problem. Input
 * is sorted internally (matching binarySearchEngine's convention) so
 * the two-pointer technique's precondition always holds. Never
 * mutates `input`.
 */
export function twoSumSortedEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input].sort((a, b) => a - b)
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (
    left: number,
    right: number,
    overrides: Partial<TwoPointerState> = {},
  ): TwoPointerState => ({
    array,
    target,
    leftPointerIndex: left,
    rightPointerIndex: right,
    currentSum: left <= right && left < n && right >= 0 ? array[left] + array[right] : null,
    found: false,
    foundPair: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Finding two numbers in the sorted array that sum to ${target}. Left pointer starts at index 0, right pointer at index ${n - 1}.`,
      pseudocodeLine: LINE.INIT,
      isPredictionRequired: false,
      state: baseState(0, n - 1),
    }),
  )

  if (n < 2) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'The array has fewer than 2 elements - no pair can sum to the target.',
        pseudocodeLine: LINE.DONE,
        isPredictionRequired: false,
        state: baseState(0, Math.max(0, n - 1)),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let left = 0
  let right = n - 1
  let found = false

  while (left < right) {
    const sum = array[left] + array[right]
    if (sum === target) {
      found = true
      break
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `arr[${left}] + arr[${right}] = ${array[left]} + ${array[right]} = ${sum}. The target is ${target}. Which pointer moves?`,
        pseudocodeLine: LINE.COMPARE,
        isPredictionRequired: true,
        state: baseState(left, right),
        criticalJunctionType: CriticalJunctionType.POINTER_MOVE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    if (sum < target) {
      left += 1
    } else {
      right -= 1
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Found the pair: arr[${left}] + arr[${right}] = ${target}.`
        : `The pointers crossed without finding a pair summing to ${target}. No solution exists.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: baseState(left, right, { found, foundPair: found ? [left, right] : null }),
      highlightIndices: found ? [left, right] : [],
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Pure snapshot engine for a two-pointer palindrome check. Compares
 * characters from both ends inward; stops at the first mismatch, or
 * once the pointers meet. Never mutates `input`.
 */
export function palindromeCheckEngine(input: string[]): AlgorithmSnapshot[] {
  const array = [...input]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (left: number, right: number, overrides: Partial<TwoPointerState> = {}): TwoPointerState => ({
    array,
    target: null,
    leftPointerIndex: left,
    rightPointerIndex: right,
    currentSum: null,
    found: false,
    foundPair: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Checking whether "${array.join('')}" is a palindrome. Left pointer starts at index 0, right pointer at index ${n - 1}.`,
      pseudocodeLine: LINE.INIT,
      isPredictionRequired: false,
      state: baseState(0, Math.max(0, n - 1)),
    }),
  )

  if (n < 2) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'A string of 0 or 1 characters is always a palindrome.',
        pseudocodeLine: LINE.DONE,
        isPredictionRequired: false,
        state: baseState(0, Math.max(0, n - 1), { found: true }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let left = 0
  let right = n - 1
  let isPalindrome = true

  while (left < right) {
    const matches = array[left] === array[right]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `arr[${left}] = "${array[left]}" and arr[${right}] = "${array[right]}". Do they match?`,
        pseudocodeLine: LINE.COMPARE,
        isPredictionRequired: true,
        state: baseState(left, right),
        criticalJunctionType: CriticalJunctionType.POINTER_MOVE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    if (!matches) {
      isPalindrome = false
      break
    }
    left += 1
    right -= 1
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: isPalindrome
        ? `"${array.join('')}" is a palindrome - every pair of characters matched.`
        : `"${array.join('')}" is not a palindrome - characters at index ${left} and ${right} did not match.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: baseState(left, right, { found: isPalindrome }),
      highlightIndices: isPalindrome ? array.map((_, i) => i) : [],
      isFinalStep: true,
    }),
  )

  return snapshots
}
