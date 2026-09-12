import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface CountingSortState {
  /** Original input array, unchanged throughout. */
  input: number[]
  /** Count array during COUNT, running prefix sums during PREFIX/PLACE. */
  count: number[]
  /** null = not yet filled. */
  output: (number | null)[]
  phase: 'COUNT' | 'PREFIX' | 'PLACE'
  currentInputIndex: number
  currentCountIndex: number
  /** Max value in input - count/output have length k+1. */
  k: number
}

const PSEUDOCODE_LINE = {
  FIND_MAX: 0,
  INIT_COUNT: 1,
  COUNT_LOOP: 2,
  COUNT_INCREMENT: 3,
  PREFIX_LOOP: 4,
  PREFIX_ACCUMULATE: 5,
  PLACE_LOOP: 6,
  PLACE_ELEMENT: 7,
  PLACE_DECREMENT: 8,
  COPY_BACK: 9,
  DONE: 10,
} as const

// Every third count, every second prefix accumulation, and every place
// gets a prediction - frequent enough to keep the learner engaged with
// the mechanically repetitive count/prefix phases without pausing on
// literally every single increment.
const COUNT_PROMPT_INTERVAL = 3
const PREFIX_PROMPT_INTERVAL = 2

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: CountingSortState
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
    dataStructureState: {
      ...params.state,
      input: [...params.state.input],
      count: [...params.state.count],
      output: [...params.state.output],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.COUNTING_SORT,
  }
}

/**
 * Pure snapshot engine for Counting Sort. Three phases over
 * non-negative integers in [0, k]: count each value's occurrences,
 * turn the count array into a prefix-sum "where does this value's
 * next occurrence go" index, then place each input element (scanned
 * in reverse, for stability) into its output slot. Never mutates
 * `input`.
 */
export function countingSortEngine(input: number[]): AlgorithmSnapshot[] {
  const n = input.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  const k = n > 0 ? Math.max(...input) : 0
  const count = new Array(k + 1).fill(0)
  const output: (number | null)[] = new Array(n).fill(null)

  push({
    description:
      n === 0
        ? 'The array is empty; there is nothing to sort.'
        : `Starting Counting Sort. The maximum value is ${k}, so a count array of length ${k + 1} (indices 0 to ${k}) is created.`,
    pseudocodeLine: PSEUDOCODE_LINE.FIND_MAX,
    isPredictionRequired: false,
    state: { input, count, output, phase: 'COUNT', currentInputIndex: -1, currentCountIndex: -1, k },
  })

  if (n === 0) {
    push({
      description: 'The array is empty; there is nothing to sort.',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { input, count, output, phase: 'PLACE', currentInputIndex: -1, currentCountIndex: -1, k },
      isFinalStep: true,
    })
    return snapshots
  }

  let countPromptCounter = 0
  for (let i = 0; i < n; i++) {
    const val = input[i]
    countPromptCounter++
    const shouldPrompt = countPromptCounter % COUNT_PROMPT_INTERVAL === 0

    push({
      description: `Counting index ${i} (value ${val}). Which bucket does it belong to?`,
      pseudocodeLine: PSEUDOCODE_LINE.COUNT_INCREMENT,
      isPredictionRequired: shouldPrompt,
      state: { input, count, output, phase: 'COUNT', currentInputIndex: i, currentCountIndex: -1, k },
      criticalJunctionType: shouldPrompt ? CriticalJunctionType.COUNT_INCREMENT : null,
      junctionDifficulty: shouldPrompt ? JunctionDifficulty.PROCEDURAL : null,
    })

    count[val] += 1

    push({
      description: `Bucket ${val} incremented to ${count[val]}.`,
      pseudocodeLine: PSEUDOCODE_LINE.COUNT_LOOP,
      isPredictionRequired: false,
      state: { input, count, output, phase: 'COUNT', currentInputIndex: i, currentCountIndex: -1, k },
    })
  }

  push({
    description: `Counting complete. The count array is [${count.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.PREFIX_LOOP,
    isPredictionRequired: false,
    state: { input, count, output, phase: 'PREFIX', currentInputIndex: -1, currentCountIndex: -1, k },
  })

  let prefixPromptCounter = 0
  for (let i = 1; i <= k; i++) {
    prefixPromptCounter++
    const shouldPrompt = prefixPromptCounter % PREFIX_PROMPT_INTERVAL === 0

    push({
      description: `Accumulating the prefix sum at index ${i}: count[${i}] + count[${i - 1}] (${count[i]} + ${count[i - 1]}). What is the new value?`,
      pseudocodeLine: PSEUDOCODE_LINE.PREFIX_ACCUMULATE,
      isPredictionRequired: shouldPrompt,
      state: { input, count, output, phase: 'PREFIX', currentInputIndex: -1, currentCountIndex: i, k },
      criticalJunctionType: shouldPrompt ? CriticalJunctionType.PREFIX_ACCUMULATE : null,
      junctionDifficulty: shouldPrompt ? JunctionDifficulty.PROCEDURAL : null,
    })

    count[i] += count[i - 1]

    push({
      description: `count[${i}] is now ${count[i]}. This means value ${i}'s last occurrence lands at output index ${count[i] - 1}.`,
      pseudocodeLine: PSEUDOCODE_LINE.PREFIX_LOOP,
      isPredictionRequired: false,
      state: { input, count, output, phase: 'PREFIX', currentInputIndex: -1, currentCountIndex: i, k },
    })
  }

  push({
    description: `Prefix sums complete. The count array now gives each value's placement index: [${count.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.PLACE_LOOP,
    isPredictionRequired: false,
    state: { input, count, output, phase: 'PLACE', currentInputIndex: -1, currentCountIndex: -1, k },
  })

  for (let i = n - 1; i >= 0; i--) {
    const val = input[i]

    push({
      description: `Placing index ${i} (value ${val}) from the input. Which output index does it go to?`,
      pseudocodeLine: PSEUDOCODE_LINE.PLACE_ELEMENT,
      isPredictionRequired: true,
      state: { input, count, output, phase: 'PLACE', currentInputIndex: i, currentCountIndex: val, k },
      criticalJunctionType: CriticalJunctionType.PLACE_ELEMENT,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    const placeIndex = count[val] - 1
    output[placeIndex] = val
    count[val] -= 1

    push({
      description: `Placed ${val} at output index ${placeIndex}. count[${val}] decremented to ${count[val]}.`,
      pseudocodeLine: PSEUDOCODE_LINE.PLACE_DECREMENT,
      isPredictionRequired: false,
      state: { input, count, output, phase: 'PLACE', currentInputIndex: i, currentCountIndex: val, k },
    })
  }

  push({
    description: `The output array is complete: [${output.join(', ')}]. What invariant proves that it is fully sorted?`,
    pseudocodeLine: PSEUDOCODE_LINE.COPY_BACK,
    isPredictionRequired: true,
    state: { input, count, output, phase: 'PLACE', currentInputIndex: -1, currentCountIndex: -1, k },
    criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  })

  push({
    description: `Counting Sort complete. The array is fully sorted: [${output.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { input, count, output, phase: 'PLACE', currentInputIndex: -1, currentCountIndex: -1, k },
    isFinalStep: true,
  })

  return snapshots
}
