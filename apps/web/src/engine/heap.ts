import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export type HeapType = 'max' | 'min'

/** A heap is a complete binary tree stored as an array: parent of index
 * i is at floor((i-1)/2), left child at 2i+1, right child at 2i+2. */
export interface HeapState {
  array: number[]
  size: number
  heapType: HeapType
  currentIdx: number
  parentIdx: number | null
  leftChildIdx: number | null
  rightChildIdx: number | null
  operation: 'insert' | 'delete'
}

function parentOf(i: number): number {
  return Math.floor((i - 1) / 2)
}
function leftChildOf(i: number): number {
  return 2 * i + 1
}
function rightChildOf(i: number): number {
  return 2 * i + 2
}

/** true when `array[a]` should be considered "higher priority" than
 * `array[b]` for this heap type - greater for a max-heap, smaller for a
 * min-heap. */
function hasPriority(heapType: HeapType, array: number[], a: number, b: number): boolean {
  return heapType === 'max' ? array[a] > array[b] : array[a] < array[b]
}

// Indices match PseudocodePanel's heap arrays exactly:
//   0: 'insert(value):'
//   1: '  append value to end of array (next available leaf)'
//   2: '  sift_up(last_index):'
//   3: '    while parent exists and arr[i] should come before arr[parent]:'
//   4: '      swap arr[i] with arr[parent]; i = parent'
const PSEUDOCODE_LINE = {
  START: 0,
  APPEND: 1,
  SIFT_START: 2,
  SIFT_COMPARE: 3,
  SIFT_SWAP: 4,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: HeapState
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
    activeIndices: [params.state.currentIdx].filter((i) => i >= 0),
    highlightIndices: [params.state.parentIdx, params.state.leftChildIdx, params.state.rightChildIdx].filter(
      (i): i is number => i !== null && i >= 0,
    ),
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.HEAP,
  }
}

/** Builds a heap engine (insert or delete) for a given heap type - the
 * four exported engines below are thin wrappers over this shared core,
 * exactly like AVL/BST share one snapshot-building core per operation. */
function buildInsertEngine(heapType: HeapType) {
  return function insertEngine(values: number[]): AlgorithmSnapshot[] {
    const snapshots: AlgorithmSnapshot[] = []
    let stepIndex = 0
    const array: number[] = []

    function push(params: Omit<SnapshotParams, 'stepIndex'>) {
      snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
    }

    function baseState(overrides: Partial<HeapState>): HeapState {
      return {
        array,
        size: array.length,
        heapType,
        currentIdx: -1,
        parentIdx: null,
        leftChildIdx: null,
        rightChildIdx: null,
        operation: 'insert',
        ...overrides,
      }
    }

    values.forEach((value, valueIndex) => {
      const isLastValue = valueIndex === values.length - 1
      array.push(value)
      let i = array.length - 1

      push({
        description: `Inserted ${value} at index ${i}, the next available leaf.`,
        pseudocodeLine: PSEUDOCODE_LINE.APPEND,
        isPredictionRequired: false,
        state: baseState({ currentIdx: i }),
      })

      while (i > 0) {
        const p = parentOf(i)
        push({
          description: `Comparing ${array[i]} at index ${i} with its parent ${array[p]} at index ${p}. Should it sift up?`,
          pseudocodeLine: PSEUDOCODE_LINE.SIFT_COMPARE,
          isPredictionRequired: true,
          state: baseState({ currentIdx: i, parentIdx: p }),
          criticalJunctionType: CriticalJunctionType.HEAP_SIFT_UP,
          junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        })

        if (!hasPriority(heapType, array, i, p)) {
          push({
            description: `${array[i]} satisfies the heap property relative to its parent ${array[p]}. No swap needed.`,
            pseudocodeLine: PSEUDOCODE_LINE.SIFT_COMPARE,
            isPredictionRequired: false,
            state: baseState({ currentIdx: i, parentIdx: p }),
          })
          break
        }

        ;[array[i], array[p]] = [array[p], array[i]]
        push({
          description: `Swapped ${array[p]} and ${array[i]}. Continuing from index ${p}.`,
          pseudocodeLine: PSEUDOCODE_LINE.SIFT_SWAP,
          isPredictionRequired: false,
          state: baseState({ currentIdx: p }),
        })
        i = p
      }

      push({
        description: `${value} inserted. The ${heapType === 'max' ? 'max' : 'min'}-heap property holds throughout.`,
        pseudocodeLine: PSEUDOCODE_LINE.START,
        isPredictionRequired: false,
        state: baseState({}),
        isFinalStep: isLastValue,
      })
    })

    if (values.length === 0) {
      push({
        description: 'No values were given to insert; the heap remains empty.',
        pseudocodeLine: PSEUDOCODE_LINE.START,
        isPredictionRequired: false,
        state: baseState({}),
        isFinalStep: true,
      })
    }

    return snapshots
  }
}

function buildDeleteEngine(heapType: HeapType) {
  return function deleteEngine(existingArray: number[]): AlgorithmSnapshot[] {
    const snapshots: AlgorithmSnapshot[] = []
    let stepIndex = 0
    const array = [...existingArray]

    function push(params: Omit<SnapshotParams, 'stepIndex'>) {
      snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
    }

    function baseState(overrides: Partial<HeapState>): HeapState {
      return {
        array,
        size: array.length,
        heapType,
        currentIdx: -1,
        parentIdx: null,
        leftChildIdx: null,
        rightChildIdx: null,
        operation: 'delete',
        ...overrides,
      }
    }

    if (array.length === 0) {
      push({
        description: 'The heap is empty. Nothing to delete.',
        pseudocodeLine: PSEUDOCODE_LINE.START,
        isPredictionRequired: false,
        state: baseState({}),
        isFinalStep: true,
      })
      return snapshots
    }

    const removed = array[0]
    push({
      description: `Removing the ${heapType === 'max' ? 'maximum' : 'minimum'} value from the root: ${removed}.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({ currentIdx: 0 }),
    })

    const last = array.pop()!
    if (array.length > 0) {
      array[0] = last
      push({
        description: `Moved the last element (${last}) to the root and shrank the array to size ${array.length}.`,
        pseudocodeLine: PSEUDOCODE_LINE.APPEND,
        isPredictionRequired: false,
        state: baseState({ currentIdx: 0 }),
      })
    }

    let i = 0
    while (true) {
      const l = leftChildOf(i)
      const r = rightChildOf(i)
      if (l >= array.length) break

      push({
        description: `At index ${i} (value ${array[i]}): which child, if any, should it swap with?`,
        pseudocodeLine: PSEUDOCODE_LINE.SIFT_COMPARE,
        isPredictionRequired: true,
        state: baseState({
          currentIdx: i,
          leftChildIdx: l,
          rightChildIdx: r < array.length ? r : null,
        }),
        criticalJunctionType: CriticalJunctionType.HEAP_SIFT_DOWN,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })

      let target = i
      if (l < array.length && hasPriority(heapType, array, l, target)) target = l
      if (r < array.length && hasPriority(heapType, array, r, target)) target = r

      if (target === i) {
        push({
          description: `${array[i]} satisfies the heap property relative to its children. No swap needed.`,
          pseudocodeLine: PSEUDOCODE_LINE.SIFT_COMPARE,
          isPredictionRequired: false,
          state: baseState({ currentIdx: i, leftChildIdx: l, rightChildIdx: r < array.length ? r : null }),
        })
        break
      }

      ;[array[i], array[target]] = [array[target], array[i]]
      push({
        description: `Swapped ${array[target]} and ${array[i]}. Continuing from index ${target}.`,
        pseudocodeLine: PSEUDOCODE_LINE.SIFT_SWAP,
        isPredictionRequired: false,
        state: baseState({ currentIdx: target }),
      })
      i = target
    }

    push({
      description: `${removed} removed. The ${heapType === 'max' ? 'max' : 'min'}-heap property holds throughout.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })

    return snapshots
  }
}

export const maxHeapInsertEngine = buildInsertEngine('max')
export const maxHeapDeleteEngine = buildDeleteEngine('max')
export const minHeapInsertEngine = buildInsertEngine('min')
export const minHeapDeleteEngine = buildDeleteEngine('min')

/** Builds a valid heap array from `values` (no snapshots) - used to seed
 * the delete engines' demo input, analogous to bstRootFor/avlRootFor. */
export function buildHeapArray(heapType: HeapType, values: number[]): number[] {
  const engine = heapType === 'max' ? maxHeapInsertEngine : minHeapInsertEngine
  const snapshots = engine(values)
  const last = snapshots[snapshots.length - 1]
  return last ? [...(last.dataStructureState as HeapState).array] : []
}

/**
 * Single source of truth for every heap page's starting array and the
 * Insert sidebar control's default value, so the registry's defaultInput,
 * the sidebar's seeded base, and the value shown in the input can never
 * drift apart. Not present in HEAP_DEFAULT_SEED and larger than every
 * value in it, so it always reads as "a new value to add", never as the
 * value the seeded demo sequence is currently narrating.
 */
export const HEAP_DEFAULT_SEED = [15, 3, 17, 10, 84, 19, 6, 22, 9]
export const HEAP_DEFAULT_INSERT_VALUE = 90
