import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface CallFrame {
  id: string
  functionName: string
  argument: number
  returnValue: number | null
  status: 'active' | 'waiting' | 'returned'
  depth: number
}

export interface CallStackState {
  frames: CallFrame[]
  baseCase: number
  currentFrameId: string | null
  /** Fibonacci-specific: values fully resolved so far during traversal, flagging a later call for the same k as a redundant recomputation. */
  computedValues?: Record<number, number>
  /** Fibonacci-specific: running count of total function calls made so far. */
  totalCalls?: number
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: CallStackState
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
    dataStructureState: { ...params.state, frames: params.state.frames.map((f) => ({ ...f })) },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

let idCounter = 0
function nextId(arg: number): string {
  return `fact-${arg}-${idCounter++}`
}

// factorial(n): if n == 0: return 1 (base case); return n * factorial(n-1) (recursive case)
const LINE = { CALL: 0, BASE_CASE: 1, RECURSIVE_CASE: 2 } as const

/**
 * Pure snapshot engine for recursive factorial. n is clamped to [1,10]
 * (larger values produce too many frames to be a useful visualization).
 * Shows every frame pushed down to the base case, then every frame
 * popping and multiplying back up.
 */
export function factorialEngine(n: number): AlgorithmSnapshot[] {
  const clamped = Math.max(1, Math.min(10, Math.round(n)))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let frames: CallFrame[] = []

  const baseState = (overrides: Partial<CallStackState> = {}): CallStackState => ({
    frames,
    baseCase: 0,
    currentFrameId: null,
    ...overrides,
  })

  // Push phase: factorial(n), factorial(n-1), ..., factorial(0).
  for (let arg = clamped; arg >= 0; arg--) {
    frames = frames.map((f, i) => (i === frames.length - 1 ? { ...f, status: 'waiting' } : f))
    const id = nextId(arg)
    frames = [...frames, { id, functionName: 'factorial', argument: arg, returnValue: null, status: 'active', depth: clamped - arg }]

    const isBaseCase = arg === 0
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: isBaseCase
          ? 'factorial(0) is the base case. What does it return?'
          : `Calling factorial(${arg}), which will call factorial(${arg - 1}).`,
        pseudocodeLine: isBaseCase ? LINE.BASE_CASE : LINE.CALL,
        isPredictionRequired: isBaseCase,
        state: baseState({ currentFrameId: id }),
        criticalJunctionType: isBaseCase ? CriticalJunctionType.BASE_CASE : null,
        junctionDifficulty: isBaseCase ? JunctionDifficulty.CONCEPTUAL : null,
      }),
    )

    if (arg === Math.ceil(clamped / 2) && clamped > 2) {
      const remaining = arg
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `${remaining} more recursive call${remaining === 1 ? '' : 's'} will be made before the base case is reached. How many more calls will there be?`,
          pseudocodeLine: LINE.CALL,
          isPredictionRequired: true,
          state: baseState({ currentFrameId: id }),
          criticalJunctionType: CriticalJunctionType.RECURSIVE_CALL,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        }),
      )
    }
  }

  // Pop phase: base case returns 1, then each frame multiplies and returns.
  let prevReturn = 1
  frames = frames.map((f) => (f.argument === 0 ? { ...f, returnValue: 1, status: 'returned' } : f))
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'factorial(0) returns 1.',
      pseudocodeLine: LINE.BASE_CASE,
      isPredictionRequired: false,
      state: baseState({ currentFrameId: frames.find((f) => f.argument === 0)!.id }),
    }),
  )

  for (let arg = 1; arg <= clamped; arg++) {
    const frame = frames.find((f) => f.argument === arg)!
    const isFinal = arg === clamped

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `factorial(${arg}) called factorial(${arg - 1}) which returned ${prevReturn}. What does factorial(${arg}) return?`,
        pseudocodeLine: LINE.RECURSIVE_CASE,
        isPredictionRequired: true,
        state: baseState({ currentFrameId: frame.id }),
        criticalJunctionType: CriticalJunctionType.RETURN_VALUE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    const value = arg * prevReturn
    frames = frames.map((f) => (f.argument === arg ? { ...f, returnValue: value, status: 'returned' } : f))
    prevReturn = value

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `factorial(${arg}) = ${arg} x ${prevReturn / arg} = ${value}.`,
        pseudocodeLine: LINE.RECURSIVE_CASE,
        isPredictionRequired: false,
        state: baseState({ currentFrameId: frame.id }),
        isFinalStep: isFinal,
      }),
    )
  }

  return snapshots
}
