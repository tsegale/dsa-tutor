import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface QueueState {
  items: Array<{ id: string; value: number | string; index: number }>
  frontIndex: number
  rearIndex: number
  capacity: number
  size: number
  lastOperation: 'enqueue' | 'dequeue' | 'peekFront' | 'peekRear' | null
  lastOperationValue: number | string | null
  isFull: boolean
  isEmpty: boolean
  variant: 'linear' | 'circular' | 'deque'
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: QueueState
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
  return `q-${value}-${idCounter++}`
}

// enqueue(x): if size == capacity: full; else: arr[rear] = x; rear++; size++
// dequeue(): if size == 0: empty; else: x = arr[front]; front++; size--; return x
//   (circular variants use modulo arithmetic on front/rear instead of plain increment)
const LINE = { ENQUEUE_CHECK: 0, ENQUEUE_PLACE: 1, DEQUEUE_CHECK: 2, DEQUEUE_RETURN: 3, WRAP: 4 } as const

function baseState(
  items: QueueState['items'],
  capacity: number,
  frontIndex: number,
  rearIndex: number,
  variant: QueueState['variant'],
  overrides: Partial<QueueState> = {},
): QueueState {
  return {
    items: items.map((it) => ({ ...it })),
    frontIndex,
    rearIndex,
    capacity,
    size: items.length,
    lastOperation: null,
    lastOperationValue: null,
    isFull: items.length >= capacity,
    isEmpty: items.length === 0,
    variant,
    ...overrides,
  }
}

/**
 * Enqueues each value in `valuesToEnqueue` onto a linear queue that
 * starts with `initialItems` occupying indices [0, initialItems.length).
 * QUEUE_REAR junction after each successful enqueue; stops (without a
 * dedicated junction - `isFull` alone narrates it) once capacity is hit.
 */
export function queueEnqueueEngine(
  initialItems: number[],
  valuesToEnqueue: number[],
  capacity: number,
): AlgorithmSnapshot[] {
  let items: QueueState['items'] = initialItems.map((value, index) => ({ id: nextId(value), value, index }))
  let frontIndex = items.length > 0 ? 0 : -1
  let rearIndex = items.length - 1
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description:
        items.length === 0
          ? `Starting with an empty queue (capacity ${capacity}).`
          : `Starting with ${items.length} item${items.length === 1 ? '' : 's'} already queued.`,
      pseudocodeLine: LINE.ENQUEUE_CHECK,
      isPredictionRequired: false,
      state: baseState(items, capacity, frontIndex, rearIndex, 'linear'),
    }),
  )

  for (let i = 0; i < valuesToEnqueue.length; i++) {
    const value = valuesToEnqueue[i]
    const isLast = i === valuesToEnqueue.length - 1

    if (items.length >= capacity) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The queue is full (${capacity} of ${capacity} slots used). ${value} cannot be enqueued.`,
          pseudocodeLine: LINE.ENQUEUE_CHECK,
          isPredictionRequired: false,
          state: baseState(items, capacity, frontIndex, rearIndex, 'linear', { isFull: true }),
          isFinalStep: true,
        }),
      )
      return snapshots
    }

    rearIndex += 1
    items = [...items, { id: nextId(value), value, index: rearIndex }]
    if (frontIndex === -1) frontIndex = rearIndex

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Enqueued ${value}. After enqueueing ${value}, where is the rear pointer now?`,
        pseudocodeLine: LINE.ENQUEUE_PLACE,
        isPredictionRequired: true,
        state: baseState(items, capacity, frontIndex, rearIndex, 'linear', {
          lastOperation: 'enqueue',
          lastOperationValue: value,
        }),
        criticalJunctionType: CriticalJunctionType.QUEUE_REAR,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        isFinalStep: isLast,
      }),
    )
  }

  if (valuesToEnqueue.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/**
 * Dequeues `dequeueCount` times from a linear queue that starts with
 * `initialItems` (capacity defaults to the starting size, so the
 * queue begins completely full - the scenario that actually produces
 * wasted ghost-cell space to teach from). QUEUE_FRONT junction after
 * each dequeue; once dequeued slots reach half the capacity, a single
 * LOAD_FACTOR junction teaches why circular queues exist.
 */
export function queueDequeueEngine(initialItems: number[], dequeueCount: number): AlgorithmSnapshot[] {
  const capacity = Math.max(1, initialItems.length)
  let items: QueueState['items'] = initialItems.map((value, index) => ({ id: nextId(value), value, index }))
  let frontIndex = items.length > 0 ? 0 : -1
  const rearIndex = items.length - 1
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let loadFactorShown = false

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with ${items.length} item${items.length === 1 ? '' : 's'} queued (capacity ${capacity}).`,
      pseudocodeLine: LINE.DEQUEUE_CHECK,
      isPredictionRequired: false,
      state: baseState(items, capacity, frontIndex, rearIndex, 'linear'),
    }),
  )

  for (let i = 0; i < dequeueCount; i++) {
    const isLast = i === dequeueCount - 1

    if (items.length === 0) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: 'The queue is empty. There is nothing left to dequeue.',
          pseudocodeLine: LINE.DEQUEUE_CHECK,
          isPredictionRequired: false,
          state: baseState(items, capacity, -1, rearIndex, 'linear', { isEmpty: true }),
          isFinalStep: true,
        }),
      )
      return snapshots
    }

    const dequeued = items[0]
    items = items.slice(1)
    frontIndex += 1

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Dequeued ${dequeued.value}. What does dequeue() return?`,
        pseudocodeLine: LINE.DEQUEUE_RETURN,
        isPredictionRequired: true,
        state: baseState(items, capacity, items.length > 0 ? frontIndex : -1, rearIndex, 'linear', {
          lastOperation: 'dequeue',
          lastOperationValue: dequeued.value,
        }),
        criticalJunctionType: CriticalJunctionType.QUEUE_FRONT,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        isFinalStep: isLast && frontIndex / capacity < 0.5,
      }),
    )

    if (!loadFactorShown && frontIndex / capacity >= 0.5) {
      loadFactorShown = true
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The front is now at index ${frontIndex} and the array has capacity ${capacity}. How much of the array is permanently wasted space that can never be reused?`,
          pseudocodeLine: LINE.DEQUEUE_CHECK,
          isPredictionRequired: true,
          state: baseState(items, capacity, items.length > 0 ? frontIndex : -1, rearIndex, 'linear', {
            lastOperation: 'dequeue',
            lastOperationValue: dequeued.value,
          }),
          criticalJunctionType: CriticalJunctionType.LOAD_FACTOR,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          isFinalStep: isLast,
        }),
      )
    }
  }

  if (dequeueCount === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/**
 * Runs a sequence of enqueue/dequeue operations on a circular queue of
 * fixed `capacity`. CIRCULAR_WRAP fires the moment the rear index
 * would advance past capacity-1 and must wrap to 0 - the core visual
 * insight of a circular queue.
 */
export function circularQueueEngine(
  capacity: number,
  operations: Array<{ op: 'enqueue' | 'dequeue'; value?: number }>,
): AlgorithmSnapshot[] {
  let items: QueueState['items'] = []
  let frontIndex = -1
  let rearIndex = -1
  let size = 0
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with an empty circular queue of capacity ${capacity}.`,
      pseudocodeLine: LINE.ENQUEUE_CHECK,
      isPredictionRequired: false,
      state: baseState(items, capacity, frontIndex, rearIndex, 'circular'),
    }),
  )

  operations.forEach((operation, i) => {
    const isLast = i === operations.length - 1

    if (operation.op === 'enqueue') {
      const value = operation.value ?? 0
      if (size >= capacity) {
        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `The circular queue is full. ${value} cannot be enqueued.`,
            pseudocodeLine: LINE.ENQUEUE_CHECK,
            isPredictionRequired: false,
            state: baseState(items, capacity, frontIndex, rearIndex, 'circular', { isFull: true }),
            isFinalStep: isLast,
          }),
        )
        return
      }

      const wouldWrap = rearIndex === capacity - 1
      if (wouldWrap) {
        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: `The rear is at index ${capacity - 1}, the last slot. Where does the next enqueue (${value}) go?`,
            pseudocodeLine: LINE.WRAP,
            isPredictionRequired: true,
            state: baseState(items, capacity, frontIndex, rearIndex, 'circular'),
            criticalJunctionType: CriticalJunctionType.CIRCULAR_WRAP,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          }),
        )
      }

      rearIndex = (rearIndex + 1) % capacity
      if (frontIndex === -1) frontIndex = rearIndex
      items = [...items, { id: nextId(value), value, index: rearIndex }]
      size += 1

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Enqueued ${value} at index ${rearIndex}${wouldWrap ? ' - the rear wrapped back to 0.' : '.'}`,
          pseudocodeLine: LINE.ENQUEUE_PLACE,
          isPredictionRequired: false,
          state: baseState(items, capacity, frontIndex, rearIndex, 'circular', {
            lastOperation: 'enqueue',
            lastOperationValue: value,
          }),
          isFinalStep: isLast,
        }),
      )
    } else {
      if (size === 0) {
        snapshots.push(
          makeSnapshot({
            stepIndex: stepIndex++,
            description: 'The circular queue is empty. There is nothing to dequeue.',
            pseudocodeLine: LINE.DEQUEUE_CHECK,
            isPredictionRequired: false,
            state: baseState(items, capacity, frontIndex, rearIndex, 'circular', { isEmpty: true }),
            isFinalStep: isLast,
          }),
        )
        return
      }

      const dequeuedValue = items.find((it) => it.index === frontIndex)!.value
      items = items.filter((it) => it.index !== frontIndex)
      size -= 1
      const nextFront = size > 0 ? (frontIndex + 1) % capacity : -1

      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Dequeued ${dequeuedValue} from index ${frontIndex}. What does dequeue() return?`,
          pseudocodeLine: LINE.DEQUEUE_RETURN,
          isPredictionRequired: true,
          state: baseState(items, capacity, nextFront, rearIndex, 'circular', {
            lastOperation: 'dequeue',
            lastOperationValue: dequeuedValue,
          }),
          criticalJunctionType: CriticalJunctionType.QUEUE_FRONT,
          junctionDifficulty: JunctionDifficulty.PROCEDURAL,
          isFinalStep: isLast,
        }),
      )
      frontIndex = nextFront
    }
  })

  if (operations.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/**
 * Runs a sequence of push/pop operations from either end on a deque of
 * fixed `capacity`. DEQUE_END junction on every operation, testing
 * whether the learner tracks which end is affected.
 */
export function dequeEngine(
  capacity: number,
  operations: Array<{ op: 'pushFront' | 'pushBack' | 'popFront' | 'popBack'; value?: number }>,
): AlgorithmSnapshot[] {
  let items: Array<{ id: string; value: number }> = []
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const toQueueItems = (): QueueState['items'] => items.map((it, index) => ({ ...it, index }))

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with an empty deque of capacity ${capacity}.`,
      pseudocodeLine: LINE.ENQUEUE_CHECK,
      isPredictionRequired: false,
      state: baseState([], capacity, -1, -1, 'deque'),
    }),
  )

  operations.forEach((operation, i) => {
    const isLast = i === operations.length - 1
    const isPush = operation.op === 'pushFront' || operation.op === 'pushBack'
    const endLabel = operation.op.toLowerCase().includes('front') ? 'front' : 'back'

    if (isPush && items.length >= capacity) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The deque is full. Cannot ${operation.op}.`,
          pseudocodeLine: LINE.ENQUEUE_CHECK,
          isPredictionRequired: false,
          state: baseState(toQueueItems(), capacity, 0, items.length - 1, 'deque', { isFull: true }),
          isFinalStep: isLast,
        }),
      )
      return
    }
    if (!isPush && items.length === 0) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The deque is empty. Cannot ${operation.op}.`,
          pseudocodeLine: LINE.DEQUEUE_CHECK,
          isPredictionRequired: false,
          state: baseState([], capacity, -1, -1, 'deque', { isEmpty: true }),
          isFinalStep: isLast,
        }),
      )
      return
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: isPush
          ? `${operation.op} adds ${operation.value} to which end?`
          : `${operation.op} removes from which end?`,
        pseudocodeLine: isPush ? LINE.ENQUEUE_CHECK : LINE.DEQUEUE_CHECK,
        isPredictionRequired: true,
        state: baseState(toQueueItems(), capacity, items.length > 0 ? 0 : -1, items.length - 1, 'deque'),
        criticalJunctionType: CriticalJunctionType.DEQUE_END,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    let opValue: number | string
    if (operation.op === 'pushFront') {
      const value = operation.value ?? 0
      items = [{ id: nextId(value), value }, ...items]
      opValue = value
    } else if (operation.op === 'pushBack') {
      const value = operation.value ?? 0
      items = [...items, { id: nextId(value), value }]
      opValue = value
    } else if (operation.op === 'popFront') {
      opValue = items[0].value
      items = items.slice(1)
    } else {
      opValue = items[items.length - 1].value
      items = items.slice(0, -1)
    }

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `${operation.op} complete at the ${endLabel}.`,
        pseudocodeLine: isPush ? LINE.ENQUEUE_PLACE : LINE.DEQUEUE_RETURN,
        isPredictionRequired: false,
        state: baseState(toQueueItems(), capacity, items.length > 0 ? 0 : -1, items.length - 1, 'deque', {
          lastOperation: isPush ? 'enqueue' : 'dequeue',
          lastOperationValue: opValue,
        }),
        isFinalStep: isLast,
      }),
    )
  })

  if (operations.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}
