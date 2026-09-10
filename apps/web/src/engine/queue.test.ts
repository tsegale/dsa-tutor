import { describe, it, expect } from 'vitest'
import { queueEnqueueEngine, queueDequeueEngine, circularQueueEngine, dequeEngine, type QueueState } from './queue'

function lastState(snapshots: { dataStructureState: unknown }[]): QueueState {
  return snapshots[snapshots.length - 1].dataStructureState as QueueState
}

function values(state: QueueState): (number | string)[] {
  return [...state.items].sort((a, b) => a.index - b.index).map((it) => it.value)
}

describe('queueEnqueueEngine', () => {
  it('enqueues onto an empty queue', () => {
    const snapshots = queueEnqueueEngine([], [5, 3, 8], 5)
    expect(values(lastState(snapshots))).toEqual([5, 3, 8])
  })

  it('enqueues onto a queue with existing items', () => {
    const snapshots = queueEnqueueEngine([1, 2], [5], 5)
    expect(values(lastState(snapshots))).toEqual([1, 2, 5])
  })

  it('flags one QUEUE_REAR junction per enqueue', () => {
    const snapshots = queueEnqueueEngine([], [5, 3, 8], 5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'QUEUE_REAR')
    expect(junctions.length).toBe(3)
  })

  it('stops enqueueing once capacity is reached', () => {
    const snapshots = queueEnqueueEngine([1, 2], [3, 4], 3)
    const state = lastState(snapshots)
    expect(values(state)).toEqual([1, 2, 3])
    expect(state.isFull).toBe(true)
  })

  it('never mutates the initial items array', () => {
    const input = [1, 2]
    queueEnqueueEngine(input, [3], 5)
    expect(input).toEqual([1, 2])
  })

  it('never mutates the values-to-enqueue array', () => {
    const input = [3, 4]
    queueEnqueueEngine([], input, 5)
    expect(input).toEqual([3, 4])
  })

  it('handles enqueueing a single value', () => {
    const snapshots = queueEnqueueEngine([], [7], 5)
    expect(values(lastState(snapshots))).toEqual([7])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = queueEnqueueEngine([1], [2, 3], 5)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('queueDequeueEngine', () => {
  it('dequeues from a queue with multiple items', () => {
    const snapshots = queueDequeueEngine([1, 2, 3], 2)
    expect(values(lastState(snapshots))).toEqual([3])
  })

  it('dequeues the single remaining item, leaving the queue empty', () => {
    const snapshots = queueDequeueEngine([5], 1)
    expect(values(lastState(snapshots))).toEqual([])
  })

  it('flags one QUEUE_FRONT junction per dequeue', () => {
    const snapshots = queueDequeueEngine([1, 2, 3, 4], 4)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'QUEUE_FRONT')
    expect(junctions.length).toBe(4)
  })

  it('reports the correct dequeued value', () => {
    const snapshots = queueDequeueEngine([1, 2, 3], 1)
    expect(lastState(snapshots).lastOperationValue).toBe(1)
  })

  it('flags a LOAD_FACTOR junction once the front reaches half of capacity', () => {
    const snapshots = queueDequeueEngine([1, 2, 3, 4], 2)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'LOAD_FACTOR')
    expect(junctions.length).toBe(1)
  })

  it('never fires LOAD_FACTOR before the halfway point', () => {
    const snapshots = queueDequeueEngine([1, 2, 3, 4], 1)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'LOAD_FACTOR')
    expect(junctions.length).toBe(0)
  })

  it('handles dequeuing from an empty queue without throwing', () => {
    const snapshots = queueDequeueEngine([], 1)
    expect(lastState(snapshots).isEmpty).toBe(true)
  })

  it('never mutates the initial items array', () => {
    const input = [1, 2, 3]
    queueDequeueEngine(input, 2)
    expect(input).toEqual([1, 2, 3])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = queueDequeueEngine([1, 2, 3], 2)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('circularQueueEngine', () => {
  it('enqueues into an empty circular queue', () => {
    const snapshots = circularQueueEngine(3, [{ op: 'enqueue', value: 5 }])
    expect(values(lastState(snapshots))).toEqual([5])
  })

  it('wraps the rear pointer back to 0 and flags CIRCULAR_WRAP', () => {
    const snapshots = circularQueueEngine(3, [
      { op: 'enqueue', value: 1 },
      { op: 'enqueue', value: 2 },
      { op: 'enqueue', value: 3 },
      { op: 'dequeue' },
      { op: 'enqueue', value: 4 },
    ])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'CIRCULAR_WRAP')
    expect(junctions.length).toBe(1)
    const state = lastState(snapshots)
    const wrapped = state.items.find((it) => it.value === 4)!
    expect(wrapped.index).toBe(0)
  })

  it('dequeues correctly, advancing the front with wraparound', () => {
    const snapshots = circularQueueEngine(3, [
      { op: 'enqueue', value: 1 },
      { op: 'enqueue', value: 2 },
      { op: 'dequeue' },
    ])
    expect(lastState(snapshots).lastOperationValue).toBe(1)
  })

  it('reports full when capacity is reached', () => {
    const snapshots = circularQueueEngine(2, [
      { op: 'enqueue', value: 1 },
      { op: 'enqueue', value: 2 },
      { op: 'enqueue', value: 3 },
    ])
    expect(lastState(snapshots).isFull).toBe(true)
  })

  it('handles dequeuing from an empty circular queue without throwing', () => {
    const snapshots = circularQueueEngine(3, [{ op: 'dequeue' }])
    expect(lastState(snapshots).isEmpty).toBe(true)
  })

  it('never wraps on the first enqueue of a fresh queue', () => {
    const snapshots = circularQueueEngine(3, [{ op: 'enqueue', value: 1 }])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'CIRCULAR_WRAP')
    expect(junctions.length).toBe(0)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = circularQueueEngine(3, [{ op: 'enqueue', value: 1 }, { op: 'dequeue' }])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('dequeEngine', () => {
  it('pushes to the front', () => {
    const snapshots = dequeEngine(5, [
      { op: 'pushBack', value: 1 },
      { op: 'pushFront', value: 2 },
    ])
    expect(values(lastState(snapshots))).toEqual([2, 1])
  })

  it('pushes to the back', () => {
    const snapshots = dequeEngine(5, [{ op: 'pushBack', value: 1 }, { op: 'pushBack', value: 2 }])
    expect(values(lastState(snapshots))).toEqual([1, 2])
  })

  it('pops from the front', () => {
    const snapshots = dequeEngine(5, [
      { op: 'pushBack', value: 1 },
      { op: 'pushBack', value: 2 },
      { op: 'popFront' },
    ])
    expect(values(lastState(snapshots))).toEqual([2])
  })

  it('pops from the back', () => {
    const snapshots = dequeEngine(5, [
      { op: 'pushBack', value: 1 },
      { op: 'pushBack', value: 2 },
      { op: 'popBack' },
    ])
    expect(values(lastState(snapshots))).toEqual([1])
  })

  it('flags one DEQUE_END junction per operation', () => {
    const snapshots = dequeEngine(5, [
      { op: 'pushBack', value: 5 },
      { op: 'pushFront', value: 3 },
      { op: 'popFront' },
    ])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'DEQUE_END')
    expect(junctions.length).toBe(3)
  })

  it('reports full when capacity is reached', () => {
    const snapshots = dequeEngine(1, [
      { op: 'pushBack', value: 1 },
      { op: 'pushFront', value: 2 },
    ])
    expect(lastState(snapshots).isFull).toBe(true)
  })

  it('reports empty when popping from an empty deque', () => {
    const snapshots = dequeEngine(3, [{ op: 'popFront' }])
    expect(lastState(snapshots).isEmpty).toBe(true)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = dequeEngine(5, [{ op: 'pushBack', value: 1 }, { op: 'popBack' }])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
