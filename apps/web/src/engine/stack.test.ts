import { describe, it, expect } from 'vitest'
import {
  stackPushEngine,
  stackPopEngine,
  stackPeekEngine,
  stackOverflowEngine,
  stackUnderflowEngine,
  type StackState,
} from './stack'

function lastState(snapshots: AlgorithmSnapshots): StackState {
  return snapshots[snapshots.length - 1].dataStructureState as StackState
}
type AlgorithmSnapshots = ReturnType<typeof stackPushEngine>

function values(state: StackState): (number | string)[] {
  return state.items.map((it) => it.value)
}

describe('stackPushEngine', () => {
  it('pushes onto an empty stack', () => {
    const snapshots = stackPushEngine([], [5, 3, 8])
    expect(values(lastState(snapshots))).toEqual([5, 3, 8])
  })

  it('pushes onto a stack with existing items', () => {
    const snapshots = stackPushEngine([1, 2], [5])
    expect(values(lastState(snapshots))).toEqual([1, 2, 5])
  })

  it('flags one STACK_PUSH_RESULT junction per push', () => {
    const snapshots = stackPushEngine([], [5, 3, 8])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'STACK_PUSH_RESULT')
    expect(junctions.length).toBe(3)
  })

  it('updates topIndex to the newest item after each push', () => {
    const snapshots = stackPushEngine([], [5, 3, 8])
    const state = lastState(snapshots)
    expect(state.topIndex).toBe(2)
    expect(state.items[state.topIndex].value).toBe(8)
  })

  it('stops pushing and flags OVERFLOW_CHECK when capacity is reached', () => {
    const snapshots = stackPushEngine([1, 2], [3, 4], 3)
    const state = lastState(snapshots)
    expect(values(state)).toEqual([1, 2, 3])
    expect(state.isOverflow).toBe(true)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'OVERFLOW_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('never mutates the initial items array', () => {
    const input = [1, 2]
    stackPushEngine(input, [3])
    expect(input).toEqual([1, 2])
  })

  it('never mutates the values-to-push array', () => {
    const input = [3, 4]
    stackPushEngine([], input)
    expect(input).toEqual([3, 4])
  })

  it('handles pushing a single value', () => {
    const snapshots = stackPushEngine([], [7])
    expect(values(lastState(snapshots))).toEqual([7])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = stackPushEngine([1], [2, 3])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = stackPushEngine([1], [2, 3])
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('stackPopEngine', () => {
  it('pops from a stack with multiple items', () => {
    const snapshots = stackPopEngine([1, 2, 3], 2)
    expect(values(lastState(snapshots))).toEqual([1])
  })

  it('pops the single remaining item, leaving the stack empty', () => {
    const snapshots = stackPopEngine([5], 1)
    expect(values(lastState(snapshots))).toEqual([])
  })

  it('flags one STACK_POP_RESULT junction per pop', () => {
    const snapshots = stackPopEngine([1, 2, 3], 3)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'STACK_POP_RESULT')
    expect(junctions.length).toBe(3)
  })

  it('reports the correct popped value on each pop', () => {
    const snapshots = stackPopEngine([1, 2, 3], 1)
    const state = lastState(snapshots)
    expect(state.lastOperationValue).toBe(3)
  })

  it('flags UNDERFLOW_CHECK when popping more times than there are items', () => {
    const snapshots = stackPopEngine([1, 2], 3)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'UNDERFLOW_CHECK')
    expect(junctions.length).toBe(1)
    expect(lastState(snapshots).isUnderflow).toBe(true)
  })

  it('flags UNDERFLOW_CHECK immediately when popping from an already-empty stack', () => {
    const snapshots = stackPopEngine([], 1)
    expect(lastState(snapshots).isUnderflow).toBe(true)
  })

  it('never mutates the initial items array', () => {
    const input = [1, 2, 3]
    stackPopEngine(input, 2)
    expect(input).toEqual([1, 2, 3])
  })

  it('handles popping zero times (no-op)', () => {
    const snapshots = stackPopEngine([1, 2], 0)
    expect(values(lastState(snapshots))).toEqual([1, 2])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = stackPopEngine([1, 2, 3], 2)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = stackPopEngine([1, 2, 3], 2)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('stackPeekEngine', () => {
  it('peeks a stack with multiple items without changing it', () => {
    const snapshots = stackPeekEngine([1, 2, 3])
    expect(values(lastState(snapshots))).toEqual([1, 2, 3])
    expect(lastState(snapshots).lastOperationValue).toBe(3)
  })

  it('peeks a single-item stack', () => {
    const snapshots = stackPeekEngine([9])
    expect(lastState(snapshots).lastOperationValue).toBe(9)
  })

  it('flags underflow when peeking an empty stack', () => {
    const snapshots = stackPeekEngine([])
    expect(lastState(snapshots).isUnderflow).toBe(true)
  })

  it('never mutates the input array', () => {
    const input = [1, 2, 3]
    stackPeekEngine(input)
    expect(input).toEqual([1, 2, 3])
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = stackPeekEngine([1, 2, 3])
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('stackOverflowEngine', () => {
  it('reports the stack as full at capacity', () => {
    const snapshots = stackOverflowEngine([1, 2, 3], 3)
    expect(lastState(snapshots).isOverflow).toBe(true)
  })

  it('flags exactly one OVERFLOW_CHECK junction', () => {
    const snapshots = stackOverflowEngine([1, 2, 3], 3)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'OVERFLOW_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('keeps the stack at exactly `capacity` items, never exceeding it', () => {
    const snapshots = stackOverflowEngine([1, 2, 3, 4, 5], 3)
    expect(lastState(snapshots).items.length).toBe(3)
  })

  it('works with a capacity of 1', () => {
    const snapshots = stackOverflowEngine([1], 1)
    expect(lastState(snapshots).isOverflow).toBe(true)
  })

  it('never mutates the input array', () => {
    const input = [1, 2, 3]
    stackOverflowEngine(input, 3)
    expect(input).toEqual([1, 2, 3])
  })
})

describe('stackUnderflowEngine', () => {
  it('starts with an empty stack', () => {
    const snapshots = stackUnderflowEngine()
    expect(snapshots[0].dataStructureState).toMatchObject({ items: [] })
  })

  it('flags exactly one UNDERFLOW_CHECK junction', () => {
    const snapshots = stackUnderflowEngine()
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'UNDERFLOW_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('marks the final state as underflowed', () => {
    const snapshots = stackUnderflowEngine()
    expect(lastState(snapshots).isUnderflow).toBe(true)
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = stackUnderflowEngine()
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})
