import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface StackState {
  items: Array<{ id: string; value: number | string }>
  topIndex: number
  capacity: number | null
  lastOperation: 'push' | 'pop' | 'peek' | null
  lastOperationValue: number | string | null
  isOverflow: boolean
  isUnderflow: boolean
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: StackState
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
    dataStructureState: { ...params.state, items: params.state.items.map((it) => ({ ...it })) },
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
function nextId(value: number): string {
  return `stack-${value}-${idCounter++}`
}

// push(x): if size == capacity: overflow; else: arr[top++] = x
// pop(): if top == 0: underflow; else: return arr[--top]
// peek(): if top == 0: underflow; else: return arr[top-1]
const LINE = { PUSH_CHECK: 0, PUSH_PLACE: 1, POP_CHECK: 2, POP_RETURN: 3, PEEK_CHECK: 4, PEEK_RETURN: 5 } as const

function itemsFrom(values: number[]): Array<{ id: string; value: number }> {
  return values.map((value) => ({ id: nextId(value), value }))
}

function baseStackState(
  items: Array<{ id: string; value: number | string }>,
  capacity: number | null,
  overrides: Partial<StackState> = {},
): StackState {
  return {
    items: items.map((it) => ({ ...it })),
    topIndex: items.length - 1,
    capacity,
    lastOperation: null,
    lastOperationValue: null,
    isOverflow: false,
    isUnderflow: false,
    ...overrides,
  }
}

/**
 * Pushes each value in `valuesToPush` onto a stack that starts with
 * `initialItems`. STACK_PUSH_RESULT junction after each successful
 * push; if `capacity` is set, a push that would exceed it triggers
 * OVERFLOW_CHECK instead and the remaining pushes are skipped.
 */
export function stackPushEngine(
  initialItems: number[],
  valuesToPush: number[],
  capacity?: number,
): AlgorithmSnapshot[] {
  const cap = capacity ?? null
  let items = itemsFrom(initialItems)
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        items.length === 0
          ? 'Starting with an empty stack.'
          : `Starting with ${items.length} item${items.length === 1 ? '' : 's'} already on the stack.`,
      pseudocodeLine: LINE.PUSH_CHECK,
      isPredictionRequired: false,
      state: baseStackState(items, cap),
    }),
  )

  for (let i = 0; i < valuesToPush.length; i++) {
    const value = valuesToPush[i]
    const wouldOverflow = cap !== null && items.length >= cap
    const isLastPush = i === valuesToPush.length - 1

    if (wouldOverflow) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The stack has ${cap} item${cap === 1 ? '' : 's'} - it is full. Can we push ${value}?`,
          pseudocodeLine: LINE.PUSH_CHECK,
          isPredictionRequired: true,
          state: baseStackState(items, cap, { isOverflow: true }),
          criticalJunctionType: CriticalJunctionType.OVERFLOW_CHECK,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          isFinalStep: true,
        }),
      )
      return snapshots
    }

    items = [...items, { id: nextId(value), value }]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Pushed ${value}. After pushing ${value}, what is the new top of stack?`,
        pseudocodeLine: LINE.PUSH_PLACE,
        isPredictionRequired: true,
        state: baseStackState(items, cap, { lastOperation: 'push', lastOperationValue: value }),
        criticalJunctionType: CriticalJunctionType.STACK_PUSH_RESULT,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        isFinalStep: isLastPush,
      }),
    )
  }

  if (valuesToPush.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/** Pops `popCount` times from a stack that starts with `initialItems`. STACK_POP_RESULT junction after each pop; UNDERFLOW_CHECK if the stack is already empty. */
export function stackPopEngine(initialItems: number[], popCount: number): AlgorithmSnapshot[] {
  let items = itemsFrom(initialItems)
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with ${items.length} item${items.length === 1 ? '' : 's'} on the stack.`,
      pseudocodeLine: LINE.POP_CHECK,
      isPredictionRequired: false,
      state: baseStackState(items, null),
    }),
  )

  for (let i = 0; i < popCount; i++) {
    const isLastPop = i === popCount - 1

    if (items.length === 0) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: 'The stack is empty. What does pop() return?',
          pseudocodeLine: LINE.POP_CHECK,
          isPredictionRequired: true,
          state: baseStackState(items, null, { isUnderflow: true }),
          criticalJunctionType: CriticalJunctionType.UNDERFLOW_CHECK,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          isFinalStep: true,
        }),
      )
      return snapshots
    }

    const popped = items[items.length - 1]
    items = items.slice(0, -1)
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `What value does pop() return?`,
        pseudocodeLine: LINE.POP_RETURN,
        isPredictionRequired: true,
        state: baseStackState(items, null, { lastOperation: 'pop', lastOperationValue: popped.value }),
        criticalJunctionType: CriticalJunctionType.STACK_POP_RESULT,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        isFinalStep: isLastPop,
      }),
    )
  }

  if (popCount === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/** Demonstrates peek(): reveals the top value without removing it. */
export function stackPeekEngine(initialItems: number[]): AlgorithmSnapshot[] {
  const items = itemsFrom(initialItems)
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  if (items.length === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: 'The stack is empty. peek() would underflow, just like pop().',
        pseudocodeLine: LINE.PEEK_CHECK,
        isPredictionRequired: false,
        state: baseStackState(items, null, { isUnderflow: true }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const top = items[items.length - 1]
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `peek() looks at the top of the stack without removing it.`,
      pseudocodeLine: LINE.PEEK_CHECK,
      isPredictionRequired: false,
      state: baseStackState(items, null),
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `peek() returns ${top.value}. The stack is unchanged - nothing was removed.`,
      pseudocodeLine: LINE.PEEK_RETURN,
      isPredictionRequired: false,
      state: baseStackState(items, null, { lastOperation: 'peek', lastOperationValue: top.value }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Fills a stack of `capacity` from `items`, then attempts one push past capacity to demonstrate overflow. */
export function stackOverflowEngine(items: number[], capacity: number): AlgorithmSnapshot[] {
  const stackItems = itemsFrom(items.slice(0, capacity))
  const overflowValue = items[capacity] ?? (items[items.length - 1] ?? 0) + 1
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The stack is full: ${stackItems.length} of ${capacity} slots used.`,
      pseudocodeLine: LINE.PUSH_CHECK,
      isPredictionRequired: false,
      state: baseStackState(stackItems, capacity),
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `The stack has ${capacity} item${capacity === 1 ? '' : 's'}. Can we push another (${overflowValue})?`,
      pseudocodeLine: LINE.PUSH_CHECK,
      isPredictionRequired: true,
      state: baseStackState(stackItems, capacity, { isOverflow: true }),
      criticalJunctionType: CriticalJunctionType.OVERFLOW_CHECK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Attempts a pop on an already-empty stack to demonstrate underflow. */
export function stackUnderflowEngine(): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'The stack starts empty.',
      pseudocodeLine: LINE.POP_CHECK,
      isPredictionRequired: false,
      state: baseStackState([], null),
    }),
  )

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: 'The stack is empty. What does pop() return?',
      pseudocodeLine: LINE.POP_CHECK,
      isPredictionRequired: true,
      state: baseStackState([], null, { isUnderflow: true }),
      criticalJunctionType: CriticalJunctionType.UNDERFLOW_CHECK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}
