import { describe, it, expect } from 'vitest'
import {
  sllInsertFrontEngine,
  sllInsertBackEngine,
  sllInsertAtEngine,
  sllDeleteEngine,
  sllSearchEngine,
  sllReverseEngine,
  type LinkedListState,
} from './singlyLinkedList'

type Snapshots = ReturnType<typeof sllInsertFrontEngine>

function lastState(snapshots: Snapshots): LinkedListState {
  return snapshots[snapshots.length - 1].dataStructureState as LinkedListState
}

/** Walks the list from head via .next, returning values in list order. */
function toValues(state: LinkedListState): (number | string)[] {
  const byId = new Map(state.nodes.map((n) => [n.id, n]))
  const values: (number | string)[] = []
  let cursor = state.headId
  const seen = new Set<string>()
  while (cursor && !seen.has(cursor)) {
    const node = byId.get(cursor)
    if (!node) break
    values.push(node.value)
    seen.add(cursor)
    cursor = node.next
  }
  return values
}

function expectSequentialSteps(snapshots: Snapshots) {
  expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
}

function expectFinalStepOnlyOnLast(snapshots: Snapshots) {
  snapshots.forEach((s, i) => {
    expect(s.isFinalStep).toBe(i === snapshots.length - 1)
  })
}

describe('sllInsertFrontEngine', () => {
  it('inserts into an empty list', () => {
    const snapshots = sllInsertFrontEngine([])
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(1)
    expect(state.headId).toBe(state.nodes[0].id)
  })

  it('inserts in front of a single-element list', () => {
    const snapshots = sllInsertFrontEngine([5])
    const state = lastState(snapshots)
    const values = toValues(state)
    expect(values.length).toBe(2)
    expect(values[1]).toBe(5)
  })

  it('inserts in front of a two-element list', () => {
    const snapshots = sllInsertFrontEngine([3, 7])
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7])
  })

  it('inserts in front of a multi-element list', () => {
    const snapshots = sllInsertFrontEngine([3, 7, 1, 9, 4])
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7, 1, 9, 4])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllInsertFrontEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags exactly one NULL_CHECK critical junction', () => {
    const snapshots = sllInsertFrontEngine([3, 7])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'NULL_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('makes the new node the head', () => {
    const snapshots = sllInsertFrontEngine([3, 7])
    const state = lastState(snapshots)
    const head = state.nodes.find((n) => n.id === state.headId)!
    expect(head.value).not.toBe(3)
    expect(head.value).not.toBe(7)
  })

  it('links the new head to the previous head', () => {
    const snapshots = sllInsertFrontEngine([3, 7])
    const state = lastState(snapshots)
    const head = state.nodes.find((n) => n.id === state.headId)!
    const second = state.nodes.find((n) => n.id === head.next)!
    expect(second.value).toBe(3)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(sllInsertFrontEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllInsertFrontEngine([1, 2, 3]))
  })
})

describe('sllInsertBackEngine', () => {
  it('inserts into an empty list', () => {
    const snapshots = sllInsertBackEngine([])
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(1)
    expect(state.headId).toBe(state.tailId)
  })

  it('appends to a single-element list', () => {
    const snapshots = sllInsertBackEngine([5])
    const values = toValues(lastState(snapshots))
    expect(values[0]).toBe(5)
    expect(values.length).toBe(2)
  })

  it('appends to a two-element list', () => {
    const snapshots = sllInsertBackEngine([3, 7])
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 2)).toEqual([3, 7])
  })

  it('appends to a multi-element list, preserving order', () => {
    const snapshots = sllInsertBackEngine([3, 7, 1, 9])
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 4)).toEqual([3, 7, 1, 9])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllInsertBackEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('asks NULL_CHECK once per node while traversing to the tail', () => {
    const snapshots = sllInsertBackEngine([3, 7, 1])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'NULL_CHECK')
    expect(junctions.length).toBe(3)
  })

  it('flags exactly one INSERT_BETWEEN critical junction', () => {
    const snapshots = sllInsertBackEngine([3, 7, 1])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_BETWEEN')
    expect(junctions.length).toBe(1)
  })

  it('updates the tail to the new node', () => {
    const snapshots = sllInsertBackEngine([3, 7])
    const state = lastState(snapshots)
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(tail.next).toBeNull()
    expect(tail.value).not.toBe(3)
    expect(tail.value).not.toBe(7)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(sllInsertBackEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllInsertBackEngine([1, 2, 3]))
  })
})

describe('sllInsertAtEngine', () => {
  it('inserts into an empty list at position 0', () => {
    const snapshots = sllInsertAtEngine([], 0)
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(1)
  })

  it('inserts at position 0 of a single-element list (becomes head)', () => {
    const snapshots = sllInsertAtEngine([5], 0)
    const values = toValues(lastState(snapshots))
    expect(values[1]).toBe(5)
  })

  it('inserts at the end of a single-element list', () => {
    const snapshots = sllInsertAtEngine([5], 1)
    const values = toValues(lastState(snapshots))
    expect(values[0]).toBe(5)
  })

  it('inserts in the middle of a two-element list', () => {
    const snapshots = sllInsertAtEngine([3, 7], 1)
    const values = toValues(lastState(snapshots))
    expect(values[0]).toBe(3)
    expect(values[2]).toBe(7)
  })

  it('inserts at the front of a multi-element list', () => {
    const snapshots = sllInsertAtEngine([3, 7, 1, 9], 0)
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7, 1, 9])
  })

  it('clamps an out-of-range position to the end', () => {
    const snapshots = sllInsertAtEngine([3, 7, 1], 99)
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 3)).toEqual([3, 7, 1])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllInsertAtEngine(input, 1)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags exactly one INSERT_BETWEEN critical junction', () => {
    const snapshots = sllInsertAtEngine([3, 7, 1], 1)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_BETWEEN')
    expect(junctions.length).toBe(1)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(sllInsertAtEngine([1, 2, 3], 1))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllInsertAtEngine([1, 2, 3], 1))
  })
})

describe('sllDeleteEngine', () => {
  it('handles deleting from an empty list without throwing', () => {
    const snapshots = sllDeleteEngine([], 5)
    expect(lastState(snapshots).nodes.length).toBe(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('deletes the only element of a single-element list', () => {
    const snapshots = sllDeleteEngine([5], 5)
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(0)
    expect(state.headId).toBeNull()
  })

  it('leaves a single-element list unchanged when the target is not found', () => {
    const snapshots = sllDeleteEngine([5], 99)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([5])
  })

  it('deletes the front of a two-element list', () => {
    const snapshots = sllDeleteEngine([3, 7], 3)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([7])
  })

  it('deletes the back of a two-element list', () => {
    const snapshots = sllDeleteEngine([3, 7], 7)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([3])
    expect(lastState(snapshots).tailId).not.toBeNull()
  })

  it('deletes the target at the front of a multi-element list', () => {
    const snapshots = sllDeleteEngine([3, 7, 1, 9], 3)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([7, 1, 9])
  })

  it('deletes the target at the back of a multi-element list', () => {
    const snapshots = sllDeleteEngine([3, 7, 1, 9], 9)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([3, 7, 1])
  })

  it('leaves a multi-element list unchanged when the target is not found', () => {
    const snapshots = sllDeleteEngine([3, 7, 1, 9], 99)
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'DELETE_RELINK')
    expect(junctions.length).toBe(0)
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllDeleteEngine(input, 7)
    expect(input).toEqual([3, 7, 1])
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllDeleteEngine([1, 2, 3], 2))
  })
})

describe('sllSearchEngine', () => {
  it('handles searching an empty list without throwing', () => {
    const snapshots = sllSearchEngine([], 5)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('finds the target in a single-element list', () => {
    const snapshots = sllSearchEngine([5], 5)
    expect(lastState(snapshots).highlightedId).not.toBeNull()
  })

  it('reports not found in a single-element list', () => {
    const snapshots = sllSearchEngine([5], 99)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('finds a target at the front of a multi-element list', () => {
    const snapshots = sllSearchEngine([3, 7, 1, 9], 3)
    const state = lastState(snapshots)
    const found = state.nodes.find((n) => n.id === state.highlightedId)!
    expect(found.value).toBe(3)
  })

  it('finds a target at the back of a multi-element list', () => {
    const snapshots = sllSearchEngine([3, 7, 1, 9], 9)
    const state = lastState(snapshots)
    const found = state.nodes.find((n) => n.id === state.highlightedId)!
    expect(found.value).toBe(9)
  })

  it('reports not found for a multi-element list', () => {
    const snapshots = sllSearchEngine([3, 7, 1, 9], 99)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllSearchEngine(input, 7)
    expect(input).toEqual([3, 7, 1])
  })

  it('visits exactly one POINTER_FOLLOW junction per node until the match', () => {
    const snapshots = sllSearchEngine([3, 7, 1, 9], 1)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'POINTER_FOLLOW')
    expect(junctions.length).toBe(3)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(sllSearchEngine([1, 2, 3], 2))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllSearchEngine([1, 2, 3], 2))
  })
})

describe('sllReverseEngine', () => {
  it('reverses an empty list (stays empty)', () => {
    const snapshots = sllReverseEngine([])
    expect(lastState(snapshots).nodes.length).toBe(0)
  })

  it('reverses a single-element list (stays the same)', () => {
    const snapshots = sllReverseEngine([5])
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([5])
  })

  it('reverses a two-element list', () => {
    const snapshots = sllReverseEngine([3, 7])
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([7, 3])
  })

  it('reverses a multi-element list', () => {
    const snapshots = sllReverseEngine([3, 7, 1, 9, 4])
    const values = toValues(lastState(snapshots))
    expect(values).toEqual([4, 9, 1, 7, 3])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    sllReverseEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('swaps head and tail', () => {
    const snapshots = sllReverseEngine([3, 7, 1])
    const state = lastState(snapshots)
    const head = state.nodes.find((n) => n.id === state.headId)!
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(head.value).toBe(1)
    expect(tail.value).toBe(3)
  })

  it('flags one POINTER_FOLLOW junction per node', () => {
    const snapshots = sllReverseEngine([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'POINTER_FOLLOW')
    expect(junctions.length).toBe(4)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(sllReverseEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(sllReverseEngine([1, 2, 3]))
  })

  it('produces a fully walkable list with no cycles after reversal', () => {
    const snapshots = sllReverseEngine([3, 7, 1, 9, 4])
    const state = lastState(snapshots)
    expect(toValues(state).length).toBe(5)
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(tail.next).toBeNull()
  })
})
