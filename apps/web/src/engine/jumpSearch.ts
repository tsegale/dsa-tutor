import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface JumpSearchState {
  array: number[]
  target: number
  jumpSize: number
  blockStart: number
  blockEnd: number
  phase: 'jumping' | 'linear'
  found: boolean
  foundIndex: number | null
}

const PSEUDOCODE_LINE = { JUMP_SIZE: 0, JUMP_CHECK: 1, LINEAR: 2, FOUND: 3, NOT_FOUND: 4 } as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: JumpSearchState
  activeIndices?: number[]
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
    canvasType: CanvasType.ARRAY,
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for Jump Search. Requires a sorted array (sorted
 * internally, matching binarySearchEngine's convention). Jumps forward
 * by sqrt(n) until a block is found whose last element is >= target,
 * then searches that block linearly. Never mutates `input`.
 */
export function jumpSearchEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input].sort((a, b) => a - b)
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const optimalJumpSize = Math.max(1, Math.round(Math.sqrt(n)))

  const baseState = (overrides: Partial<JumpSearchState> = {}): JumpSearchState => ({
    array,
    target,
    jumpSize: optimalJumpSize,
    blockStart: 0,
    blockEnd: 0,
    phase: 'jumping',
    found: false,
    foundIndex: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The array has ${n} element${n === 1 ? '' : 's'}. What is the optimal jump size?`,
      pseudocodeLine: PSEUDOCODE_LINE.JUMP_SIZE,
      isPredictionRequired: n > 0,
      state: baseState(),
      criticalJunctionType: n > 0 ? CriticalJunctionType.JUMP_SIZE : null,
      junctionDifficulty: n > 0 ? JunctionDifficulty.CONCEPTUAL : null,
    }),
  )

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so target ${target} was not found.`,
        pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
        isPredictionRequired: false,
        state: baseState(),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let step = optimalJumpSize
  let prev = 0

  while (array[Math.min(step, n) - 1] < target) {
    const checkIndex = Math.min(step, n) - 1
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `arr[${checkIndex}] = ${array[checkIndex]}. Is this >= the target ${target}?`,
        pseudocodeLine: PSEUDOCODE_LINE.JUMP_CHECK,
        isPredictionRequired: true,
        state: baseState({ blockStart: prev, blockEnd: checkIndex }),
        activeIndices: [checkIndex],
        criticalJunctionType: CriticalJunctionType.MIDPOINT_DECISION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    prev = step
    step += optimalJumpSize
    if (prev >= n) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Jumped past the end of the array without finding a block containing ${target}. Not found.`,
          pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
          isPredictionRequired: false,
          state: baseState({ blockStart: prev, blockEnd: n - 1 }),
          isFinalStep: true,
        }),
      )
      return snapshots
    }
  }

  const blockEnd = Math.min(step, n) - 1
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `arr[${blockEnd}] = ${array[blockEnd]} is >= the target ${target}. The target must be in the block [${prev}, ${blockEnd}] - starting a linear search there.`,
      pseudocodeLine: PSEUDOCODE_LINE.JUMP_CHECK,
      isPredictionRequired: false,
      state: baseState({ blockStart: prev, blockEnd, phase: 'linear' }),
      activeIndices: [blockEnd],
    }),
  )

  let found = false
  let foundIndex: number | null = null

  for (let i = prev; i <= blockEnd; i++) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Linearly checking index ${i} (value ${array[i]}) against the target ${target}.`,
        pseudocodeLine: PSEUDOCODE_LINE.LINEAR,
        isPredictionRequired: false,
        state: baseState({ blockStart: prev, blockEnd, phase: 'linear' }),
        activeIndices: [i],
      }),
    )
    if (array[i] === target) {
      found = true
      foundIndex = i
      break
    }
    if (array[i] > target) break
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Jump Search complete. Target ${target} was found at index ${foundIndex}.`
        : `Jump Search complete. Target ${target} was not found in the array.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: true,
      state: baseState({ blockStart: prev, blockEnd, phase: 'linear', found, foundIndex }),
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}
