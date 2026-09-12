import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface RadixSortState {
  /** Current array state (as of the start of the current pass). */
  array: number[]
  /** 10 buckets, each holding the elements assigned to it so far this pass. */
  buckets: number[][]
  /** 1 = ones, 10 = tens, 100 = hundreds, ... */
  digitPosition: number
  currentElementIndex: number
  currentElement: number
  /** The digit extracted from currentElement at digitPosition. */
  currentDigit: number
  /** Total number of passes this input requires. */
  maxDigits: number
  /** 1-indexed: which pass we're on. */
  passNumber: number
}

const PSEUDOCODE_LINE = {
  FIND_MAX: 0,
  COMPUTE_DIGITS: 1,
  PASS_LOOP: 2,
  INIT_BUCKETS: 3,
  ELEMENT_LOOP: 4,
  EXTRACT_DIGIT: 5,
  DIGIT_BUCKET: 6,
  COLLECT: 7,
  DONE: 8,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: RadixSortState
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
      array: [...params.state.array],
      buckets: params.state.buckets.map((bucket) => [...bucket]),
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.RADIX_SORT,
  }
}

function emptyBuckets(): number[][] {
  return Array.from({ length: 10 }, () => [])
}

/**
 * Pure snapshot engine for Least-Significant-Digit Radix Sort. Assumes
 * non-negative integers. Repeatedly distributes elements into 10
 * buckets (0-9) keyed by the current digit position, starting from the
 * ones digit, then collects them back in bucket order - a stable pass
 * per digit. Never mutates `input`.
 */
export function radixSortEngine(input: number[]): AlgorithmSnapshot[] {
  let working = [...input]
  const n = working.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  const maxValue = n > 0 ? Math.max(...working) : 0
  const maxDigits = maxValue === 0 ? 1 : Math.floor(Math.log10(maxValue)) + 1

  push({
    description:
      n === 0
        ? 'The array is empty; there is nothing to sort.'
        : `Starting Radix Sort (LSD). The maximum value is ${maxValue}, which has ${maxDigits} digit${maxDigits === 1 ? '' : 's'} - that many passes are needed, starting from the ones digit.`,
    pseudocodeLine: PSEUDOCODE_LINE.FIND_MAX,
    isPredictionRequired: false,
    state: { array: working, buckets: emptyBuckets(), digitPosition: 1, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber: 0 },
  })

  if (n === 0) {
    push({
      description: 'The array is empty; there is nothing to sort.',
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
      isPredictionRequired: false,
      state: { array: working, buckets: emptyBuckets(), digitPosition: 1, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber: 0 },
      isFinalStep: true,
    })
    return snapshots
  }

  let digitPosition = 1
  let passNumber = 1

  while (passNumber <= maxDigits) {
    const digitLabel = digitPosition === 1 ? 'ones' : digitPosition === 10 ? 'tens' : digitPosition === 100 ? 'hundreds' : `10^${Math.log10(digitPosition)}`

    push({
      description: `Starting pass ${passNumber}: sorting by the ${digitLabel} digit.`,
      pseudocodeLine: PSEUDOCODE_LINE.PASS_LOOP,
      isPredictionRequired: false,
      state: { array: working, buckets: emptyBuckets(), digitPosition, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber },
    })

    const buckets = emptyBuckets()

    for (let i = 0; i < n; i++) {
      const element = working[i]
      const digit = Math.floor(element / digitPosition) % 10

      push({
        description: `Element ${element} (index ${i}): the ${digitLabel} digit is ${digit}. Which bucket does it go into?`,
        pseudocodeLine: PSEUDOCODE_LINE.DIGIT_BUCKET,
        isPredictionRequired: true,
        state: {
          array: working,
          buckets,
          digitPosition,
          currentElementIndex: i,
          currentElement: element,
          currentDigit: digit,
          maxDigits,
          passNumber,
        },
        criticalJunctionType: CriticalJunctionType.DIGIT_BUCKET,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })

      buckets[digit].push(element)

      push({
        description: `${element} placed into bucket ${digit}.`,
        pseudocodeLine: PSEUDOCODE_LINE.EXTRACT_DIGIT,
        isPredictionRequired: false,
        state: {
          array: working,
          buckets,
          digitPosition,
          currentElementIndex: i,
          currentElement: element,
          currentDigit: digit,
          maxDigits,
          passNumber,
        },
      })
    }

    working = buckets.flat()

    push({
      description: `Collecting the buckets back in order 0 through 9. The array is now [${working.join(', ')}].`,
      pseudocodeLine: PSEUDOCODE_LINE.COLLECT,
      isPredictionRequired: false,
      state: { array: working, buckets, digitPosition, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber },
    })

    digitPosition *= 10
    passNumber++
  }

  push({
    description: 'The array is fully sorted. What invariant proves that sorting is complete?',
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: true,
    state: { array: working, buckets: emptyBuckets(), digitPosition, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber: maxDigits },
    criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  })

  push({
    description: `Radix Sort complete. The array is fully sorted: [${working.join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { array: working, buckets: emptyBuckets(), digitPosition, currentElementIndex: -1, currentElement: 0, currentDigit: -1, maxDigits, passNumber: maxDigits },
    isFinalStep: true,
  })

  return snapshots
}
