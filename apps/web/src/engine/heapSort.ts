import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface HeapSortState {
  array: number[]
  /** Elements at index >= heapSize are already in their final sorted position. */
  heapSize: number
}

const PSEUDOCODE_LINE = {
  BUILD_START: 0,
  HEAPIFY_DEF: 1,
  INIT_LARGEST: 2,
  COMPARE: 3,
  SWAP: 4,
  EXTRACT_LOOP: 5,
  EXTRACT_SWAP: 6,
  SIFT_DOWN: 7,
  DONE: 8,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: HeapSortState
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
 * Pure snapshot engine for Heap Sort. Two phases: build a max-heap by
 * heapifying every internal node bottom-up, then repeatedly swap the
 * root (the current maximum) with the last unsorted element and sift
 * the new root down to restore the heap property. Never mutates
 * `input`.
 */
export function heapSortEngine(input: number[]): AlgorithmSnapshot[] {
  const working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  // Sifts the element at index `i` down within the heap bounded by
  // `size`, comparing it against its larger child at every level where
  // a comparison is actually meaningful (a leaf has nothing to compare
  // against, so it's skipped silently rather than padding the step
  // sequence with a no-op snapshot).
  function heapify(i: number, size: number) {
    const left = 2 * i + 1
    const right = 2 * i + 2

    let largerChild: number
    if (left < size && right < size) {
      largerChild = working[left] >= working[right] ? left : right
    } else if (left < size) {
      largerChild = left
    } else if (right < size) {
      largerChild = right
    } else {
      return
    }

    const shouldSift = working[largerChild] > working[i]

    push({
      description: `Heapify: parent index ${i} (value ${working[i]}) vs child index ${largerChild} (value ${working[largerChild]}). Should the parent sift down?`,
      pseudocodeLine: PSEUDOCODE_LINE.COMPARE,
      isPredictionRequired: true,
      state: { array: working, heapSize: size },
      activeIndices: [i, largerChild],
      comparedIndices: [largerChild],
      criticalJunctionType: CriticalJunctionType.HEAP_COMPARE,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    if (!shouldSift) {
      push({
        description: `${working[i]} is already at least as large as both children. The heap property holds here.`,
        pseudocodeLine: PSEUDOCODE_LINE.INIT_LARGEST,
        isPredictionRequired: false,
        state: { array: working, heapSize: size },
        activeIndices: [i],
      })
      return
    }

    const temp = working[i]
    working[i] = working[largerChild]
    working[largerChild] = temp

    push({
      description: `Swapped index ${i} and index ${largerChild}. The array is now [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.SWAP,
      isPredictionRequired: false,
      state: { array: working, heapSize: size },
      swappedIndices: [i, largerChild],
    })

    heapify(largerChild, size)
  }

  push({
    description:
      'Starting Heap Sort. First, the array is rearranged into a max-heap: every parent is at least as large as its children.',
    pseudocodeLine: PSEUDOCODE_LINE.BUILD_START,
    isPredictionRequired: false,
    state: { array: working, heapSize: n },
  })

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    push({
      description: `Heapifying the subtree rooted at index ${i}.`,
      pseudocodeLine: PSEUDOCODE_LINE.HEAPIFY_DEF,
      isPredictionRequired: false,
      state: { array: working, heapSize: n },
      activeIndices: [i],
    })
    heapify(i, n)
  }

  push({
    description: `The max-heap is built: [${working.join(', ')}]. The root, index 0, now holds the maximum value.`,
    pseudocodeLine: PSEUDOCODE_LINE.EXTRACT_LOOP,
    isPredictionRequired: false,
    state: { array: working, heapSize: n },
  })

  for (let i = n - 1; i >= 1; i--) {
    push({
      description: `Extract ${working[0]} — it's the current maximum.`,
      pseudocodeLine: PSEUDOCODE_LINE.EXTRACT_SWAP,
      isPredictionRequired: true,
      state: { array: working, heapSize: i + 1 },
      activeIndices: [0],
      criticalJunctionType: CriticalJunctionType.HEAP_EXTRACT,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    const temp = working[0]
    working[0] = working[i]
    working[i] = temp

    push({
      description: `Swapped the maximum into its final sorted position at index ${i}. The array is now [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.EXTRACT_SWAP,
      isPredictionRequired: false,
      state: { array: working, heapSize: i },
      swappedIndices: [0, i],
      highlightIndices: Array.from({ length: n - i }, (_, idx) => i + idx),
    })

    push({
      description: `Sifting the new root down to restore the heap property within the remaining ${i} elements.`,
      pseudocodeLine: PSEUDOCODE_LINE.SIFT_DOWN,
      isPredictionRequired: false,
      state: { array: working, heapSize: i },
      highlightIndices: Array.from({ length: n - i }, (_, idx) => i + idx),
    })
    heapify(0, i)
  }

  push({
    description: 'The array is fully sorted. What invariant proves that sorting is complete?',
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: true,
    state: { array: working, heapSize: 0 },
    highlightIndices: Array.from({ length: n }, (_, idx) => idx),
    criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  })

  push({
    description: `Heap Sort complete. The array is fully sorted: [${working.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { array: working, heapSize: 0 },
    highlightIndices: Array.from({ length: n }, (_, idx) => idx),
    isFinalStep: true,
  })

  return snapshots
}
