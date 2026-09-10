import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface ArrayOperationState {
  array: number[]
  operation: 'access' | 'insert' | 'delete'
  targetIndex: number
  operationValue: number | null
  shiftDirection: 'left' | 'right' | null
  affectedRange: [number, number] | null
  resultIndex: number | null
  originalLength: number
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: ArrayOperationState
  activeIndices?: number[]
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
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [...(params.swappedIndices ?? [])],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

// access(arr, i): if i < 0 or i >= arr.length: throw IndexOutOfBounds; return arr[i]
const ACCESS_LINE = { START: 0, BOUNDS_CHECK: 1, RETURN: 2 } as const

// insert(arr, value, pos): for i from arr.length-1 downto pos: arr[i+1] = arr[i]; arr[pos] = value
const INSERT_LINE = { START: 0, SHIFT_LOOP: 1, PLACE: 2 } as const

// delete(arr, pos): for i from pos to arr.length-2: arr[i] = arr[i+1]; arr.length -= 1
const DELETE_LINE = { START: 0, SHIFT_LOOP: 1, SHRINK: 2 } as const

/**
 * Pure snapshot engine for direct array access. Real array access is
 * O(1) - the walk-and-highlight animation from index 0 to targetIndex
 * is a teaching device for "here's the index that gets you there", not
 * a claim that access is O(n); the complexity stays O(1) throughout.
 */
export function arrayAccessEngine(input: number[], targetIndex: number): AlgorithmSnapshot[] {
  const array = [...input]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (overrides: Partial<ArrayOperationState> = {}): ArrayOperationState => ({
    array,
    operation: 'access',
    targetIndex,
    operationValue: null,
    shiftDirection: null,
    affectedRange: null,
    resultIndex: null,
    originalLength: n,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Accessing index ${targetIndex} in an array of ${n} element${n === 1 ? '' : 's'}.`,
      pseudocodeLine: ACCESS_LINE.START,
      isPredictionRequired: false,
      state: baseState(),
    }),
  )

  if (targetIndex < 0 || targetIndex >= n) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description:
          n === 0
            ? `The array is empty, so index ${targetIndex} is always out of bounds.`
            : `Index ${targetIndex} is out of bounds for an array of length ${n} (valid indices: 0 to ${n - 1}).`,
        pseudocodeLine: ACCESS_LINE.BOUNDS_CHECK,
        isPredictionRequired: false,
        state: baseState(),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  for (let i = 0; i <= targetIndex; i++) {
    const isTarget = i === targetIndex
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: isTarget
          ? `Reached index ${targetIndex}. What value is stored here?`
          : `Locating index ${i} on the way to index ${targetIndex}.`,
        pseudocodeLine: isTarget ? ACCESS_LINE.RETURN : ACCESS_LINE.BOUNDS_CHECK,
        isPredictionRequired: isTarget,
        state: baseState({ resultIndex: isTarget ? targetIndex : null }),
        activeIndices: [i],
        criticalJunctionType: isTarget ? CriticalJunctionType.INDEX_ACCESS : null,
        junctionDifficulty: isTarget ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Found value ${array[targetIndex]} at index ${targetIndex}.`,
      pseudocodeLine: ACCESS_LINE.RETURN,
      isPredictionRequired: false,
      state: baseState({ resultIndex: targetIndex }),
      highlightIndices: [targetIndex],
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Pure snapshot engine for array insertion. position is clamped to
 * [0, input.length] (inserting at input.length appends). Shifts every
 * element from the end back to position one slot right before placing
 * value, matching the standard in-place array-insert algorithm.
 */
export function arrayInsertEngine(input: number[], value: number, position: number): AlgorithmSnapshot[] {
  const original = [...input]
  const n = original.length
  const pos = Math.max(0, Math.min(position, n))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (array: number[], overrides: Partial<ArrayOperationState> = {}): ArrayOperationState => ({
    array,
    operation: 'insert',
    targetIndex: pos,
    operationValue: value,
    shiftDirection: null,
    affectedRange: null,
    resultIndex: null,
    originalLength: n,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Inserting ${value} at index ${pos} into an array of ${n} element${n === 1 ? '' : 's'}.`,
      pseudocodeLine: INSERT_LINE.START,
      isPredictionRequired: false,
      state: baseState(original),
    }),
  )

  if (n === 0) {
    const finalArray = [value]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so ${value} is placed directly at index 0. No shifting is needed.`,
        pseudocodeLine: INSERT_LINE.PLACE,
        isPredictionRequired: false,
        state: baseState(finalArray, { resultIndex: 0 }),
        highlightIndices: [0],
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const needsShift = pos < n
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: needsShift
        ? `To make room at index ${pos}, every element from index ${pos} to ${n - 1} must shift one position to the right.`
        : `Inserting at index ${pos} (the end) requires no shifting - it's the next open slot.`,
      pseudocodeLine: INSERT_LINE.SHIFT_LOOP,
      isPredictionRequired: false,
      state: baseState(original, {
        shiftDirection: needsShift ? 'right' : null,
        affectedRange: needsShift ? [pos, n - 1] : null,
      }),
      activeIndices: [pos],
    }),
  )

  // Working buffer grows to n+1 slots up front. The extra slot starts
  // as a duplicate of the last element so every intermediate snapshot
  // stays a valid number[] while the shift is still in progress.
  let working = [...original, original[n - 1]]

  for (let i = n - 1; i >= pos; i--) {
    working = [...working]
    working[i + 1] = working[i]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Shifting the element at index ${i} (value ${original[i]}) to index ${i + 1}.`,
        pseudocodeLine: INSERT_LINE.SHIFT_LOOP,
        isPredictionRequired: false,
        state: baseState(working, { shiftDirection: 'right', affectedRange: [pos, n - 1] }),
        activeIndices: [i, i + 1],
        swappedIndices: [i + 1],
      }),
    )
  }

  working = [...working]
  working[pos] = value

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Placed ${value} at index ${pos}. The array now has ${working.length} elements.`,
      pseudocodeLine: INSERT_LINE.PLACE,
      isPredictionRequired: true,
      state: baseState(working, { resultIndex: pos }),
      highlightIndices: [pos],
      criticalJunctionType: CriticalJunctionType.INSERT_POSITION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Pure snapshot engine for array deletion. position is clamped to a
 * valid index. Shifts every element after position one slot left to
 * close the gap, matching the standard in-place array-delete algorithm.
 */
export function arrayDeleteEngine(input: number[], position: number): AlgorithmSnapshot[] {
  const original = [...input]
  const n = original.length
  const pos = Math.max(0, Math.min(position, Math.max(0, n - 1)))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (
    array: number[],
    deletedValue: number | null,
    overrides: Partial<ArrayOperationState> = {},
  ): ArrayOperationState => ({
    array,
    operation: 'delete',
    targetIndex: pos,
    operationValue: deletedValue,
    shiftDirection: null,
    affectedRange: null,
    resultIndex: null,
    originalLength: n,
    ...overrides,
  })

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'The array is already empty - there is nothing to delete.',
        pseudocodeLine: DELETE_LINE.START,
        isPredictionRequired: false,
        state: baseState(original, null),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const deletedValue = original[pos]

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Deleting the element at index ${pos} (value ${deletedValue}) from an array of ${n} element${n === 1 ? '' : 's'}.`,
      pseudocodeLine: DELETE_LINE.START,
      isPredictionRequired: false,
      state: baseState(original, deletedValue),
      activeIndices: [pos],
    }),
  )

  const needsShift = pos < n - 1
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: needsShift
        ? `Removing index ${pos} leaves a gap that must be filled by shifting elements ${pos + 1} to ${n - 1} left.`
        : `Removing the last element leaves no gap to fill - no shifting is needed.`,
      pseudocodeLine: DELETE_LINE.SHIFT_LOOP,
      isPredictionRequired: false,
      state: baseState(original, deletedValue, {
        shiftDirection: needsShift ? 'left' : null,
        affectedRange: needsShift ? [pos + 1, n - 1] : null,
      }),
      activeIndices: [pos],
    }),
  )

  let working = [...original]
  for (let i = pos; i < n - 1; i++) {
    working = [...working]
    working[i] = working[i + 1]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Shifting the element at index ${i + 1} (value ${original[i + 1]}) left to index ${i}.`,
        pseudocodeLine: DELETE_LINE.SHIFT_LOOP,
        isPredictionRequired: false,
        state: baseState(working, deletedValue, { shiftDirection: 'left', affectedRange: [pos + 1, n - 1] }),
        activeIndices: [i, i + 1],
        swappedIndices: [i],
      }),
    )
  }

  const finalArray = working.slice(0, n - 1)
  const resultIndex = pos < finalArray.length ? pos : null

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        resultIndex !== null
          ? `Deletion complete. Index ${pos} now holds ${finalArray[pos]}. The array shrank to ${finalArray.length} element${finalArray.length === 1 ? '' : 's'}.`
          : `Deletion complete. The array shrank to ${finalArray.length} element${finalArray.length === 1 ? '' : 's'}.`,
      pseudocodeLine: DELETE_LINE.SHRINK,
      isPredictionRequired: true,
      state: baseState(finalArray, deletedValue, { resultIndex }),
      highlightIndices: resultIndex !== null ? [resultIndex] : [],
      criticalJunctionType: CriticalJunctionType.DELETE_SHIFT,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}
