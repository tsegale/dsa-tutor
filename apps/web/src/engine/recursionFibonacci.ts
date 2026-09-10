import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { CallFrame, CallStackState } from './recursionFactorial'

export type { CallFrame, CallStackState }

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

// fib(k): if k <= 1: return k (base case); return fib(k-1) + fib(k-2) (recursive case)
const LINE = { CALL: 0, BASE_CASE: 1, RECURSIVE_RETURN: 2 } as const

let idCounter = 0

/**
 * Pure snapshot engine for naive recursive Fibonacci. n is clamped to
 * [1,8] - the call count is exponential, so even n=8 already produces
 * dozens of frames. Simulates the real call stack via a full DFS of
 * the recursion tree (at any instant, only the current call path is on
 * the stack - siblings push and pop as each subtree resolves), and
 * tracks which values have already been fully computed once, so a
 * later call for the same k can be flagged as redundant work without
 * actually skipping it (naive recursion never does memoize).
 */
export function fibonacciEngine(n: number): AlgorithmSnapshot[] {
  const clamped = Math.max(1, Math.min(8, Math.round(n)))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let frames: CallFrame[] = []
  const computedValues: Record<number, number> = {}
  let totalCalls = 0
  let recursiveCallJunctionShown = false
  let baseCaseJunctionShown = false

  const baseState = (overrides: Partial<CallStackState> = {}): CallStackState => ({
    frames,
    baseCase: 1,
    currentFrameId: null,
    computedValues: { ...computedValues },
    totalCalls,
    ...overrides,
  })

  function fib(k: number): number {
    totalCalls += 1
    const isRedundant = k in computedValues

    frames = frames.map((f, i) => (i === frames.length - 1 ? { ...f, status: 'waiting' as const } : f))
    const id = `fib-${k}-${idCounter++}`
    frames = [...frames, { id, functionName: 'fib', argument: k, returnValue: null, status: 'active', depth: frames.length }]

    if (!recursiveCallJunctionShown && k === clamped && clamped > 2) {
      recursiveCallJunctionShown = true
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `fib(${clamped}) needs fib(${clamped - 1}) and fib(${clamped - 2}). How many total function calls does this create in the naive recursive approach?`,
          pseudocodeLine: LINE.CALL,
          isPredictionRequired: true,
          state: baseState({ currentFrameId: id }),
          criticalJunctionType: CriticalJunctionType.RECURSIVE_CALL,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        }),
      )
    } else {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: isRedundant
            ? `Calling fib(${k}) again - this value was already computed earlier in the traversal. Naive recursion redoes the work instead of reusing it.`
            : `Calling fib(${k}). Total calls so far: ${totalCalls}.`,
          pseudocodeLine: LINE.CALL,
          isPredictionRequired: false,
          state: baseState({ currentFrameId: id }),
        }),
      )
    }

    let value: number
    if (k <= 1) {
      value = k
      if (k === 1 && !baseCaseJunctionShown) {
        baseCaseJunctionShown = true
        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: 'fib(1) = ?',
            pseudocodeLine: LINE.BASE_CASE,
            isPredictionRequired: true,
            state: baseState({ currentFrameId: id }),
            criticalJunctionType: CriticalJunctionType.BASE_CASE,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          }),
        )
      }
    } else {
      const left = fib(k - 1)
      const right = fib(k - 2)
      value = left + right
    }

    frames = frames.map((f) => (f.id === id ? { ...f, returnValue: value, status: 'returned' as const } : f))
    computedValues[k] = value

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `fib(${k}) returns ${value}. Total calls so far: ${totalCalls}.`,
        pseudocodeLine: k <= 1 ? LINE.BASE_CASE : LINE.RECURSIVE_RETURN,
        isPredictionRequired: false,
        state: baseState({ currentFrameId: id }),
      }),
    )

    frames = frames.filter((f) => f.id !== id)
    frames = frames.map((f, i) => (i === frames.length - 1 ? { ...f, status: 'active' as const } : f))

    return value
  }

  fib(clamped)

  snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }

  return snapshots
}
