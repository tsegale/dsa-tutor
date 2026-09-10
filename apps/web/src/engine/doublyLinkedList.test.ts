import { describe, it, expect } from 'vitest'
import {
  dllInsertFrontEngine,
  dllInsertBackEngine,
  dllInsertAtEngine,
  dllDeleteEngine,
  dllSearchEngine,
  dllReverseEngine,
  type LinkedListState,
} from './doublyLinkedList'

type Snapshots = ReturnType<typeof dllInsertFrontEngine>

function lastState(snapshots: Snapshots): LinkedListState {
  return snapshots[snapshots.length - 1].dataStructureState as LinkedListState
}

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

/** Every node's prev must match the id of the node preceding it, and vice versa - the DLL invariant SLL doesn't have to satisfy. */
function expectPrevNextConsistency(state: LinkedListState) {
  const byId = new Map(state.nodes.map((n) => [n.id, n]))
  for (const node of state.nodes) {
    if (node.next) {
      const next = byId.get(node.next)!
      expect(next.prev).toBe(node.id)
    }
    if (node.prev) {
      const prev = byId.get(node.prev)!
      expect(prev.next).toBe(node.id)
    }
  }
  if (state.headId) expect(byId.get(state.headId)!.prev).toBeNull()
  if (state.tailId) expect(byId.get(state.tailId)!.next).toBeNull()
}

function expectSequentialSteps(snapshots: Snapshots) {
  expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
}

function expectFinalStepOnlyOnLast(snapshots: Snapshots) {
  snapshots.forEach((s, i) => {
    expect(s.isFinalStep).toBe(i === snapshots.length - 1)
  })
}

describe('dllInsertFrontEngine', () => {
  it('inserts into an empty list', () => {
    const snapshots = dllInsertFrontEngine([])
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(1)
    expectPrevNextConsistency(state)
  })

  it('inserts in front of a single-element list', () => {
    const snapshots = dllInsertFrontEngine([5])
    const values = toValues(lastState(snapshots))
    expect(values[1]).toBe(5)
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('inserts in front of a two-element list', () => {
    const snapshots = dllInsertFrontEngine([3, 7])
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7])
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('inserts in front of a multi-element list', () => {
    const snapshots = dllInsertFrontEngine([3, 7, 1, 9, 4])
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7, 1, 9, 4])
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllInsertFrontEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags exactly one INSERT_BETWEEN critical junction', () => {
    const snapshots = dllInsertFrontEngine([3, 7])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_BETWEEN')
    expect(junctions.length).toBe(1)
  })

  it('makes the new node the head with a null prev', () => {
    const snapshots = dllInsertFrontEngine([3, 7])
    const state = lastState(snapshots)
    const head = state.nodes.find((n) => n.id === state.headId)!
    expect(head.prev).toBeNull()
  })

  it('sets the old head prev to the new node', () => {
    const snapshots = dllInsertFrontEngine([3, 7])
    const state = lastState(snapshots)
    const head = state.nodes.find((n) => n.id === state.headId)!
    const second = state.nodes.find((n) => n.id === head.next)!
    expect(second.prev).toBe(head.id)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(dllInsertFrontEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllInsertFrontEngine([1, 2, 3]))
  })
})

describe('dllInsertBackEngine', () => {
  it('inserts into an empty list', () => {
    const snapshots = dllInsertBackEngine([])
    const state = lastState(snapshots)
    expect(state.headId).toBe(state.tailId)
    expectPrevNextConsistency(state)
  })

  it('appends to a single-element list', () => {
    const snapshots = dllInsertBackEngine([5])
    const values = toValues(lastState(snapshots))
    expect(values[0]).toBe(5)
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('appends to a two-element list', () => {
    const snapshots = dllInsertBackEngine([3, 7])
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 2)).toEqual([3, 7])
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('appends to a multi-element list, preserving order', () => {
    const snapshots = dllInsertBackEngine([3, 7, 1, 9])
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 4)).toEqual([3, 7, 1, 9])
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllInsertBackEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags exactly one INSERT_BETWEEN critical junction (no traversal needed with a tail pointer)', () => {
    const snapshots = dllInsertBackEngine([3, 7, 1])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_BETWEEN')
    expect(junctions.length).toBe(1)
  })

  it('updates the new tail to have a null next', () => {
    const snapshots = dllInsertBackEngine([3, 7])
    const state = lastState(snapshots)
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(tail.next).toBeNull()
  })

  it('links the new tail prev back to the old tail', () => {
    const snapshots = dllInsertBackEngine([3, 7])
    const state = lastState(snapshots)
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    const prevTail = state.nodes.find((n) => n.id === tail.prev)!
    expect(prevTail.value).toBe(7)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(dllInsertBackEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllInsertBackEngine([1, 2, 3]))
  })
})

describe('dllInsertAtEngine', () => {
  it('inserts into an empty list at position 0', () => {
    const snapshots = dllInsertAtEngine([], 0)
    expect(lastState(snapshots).nodes.length).toBe(1)
  })

  it('inserts at position 0 of a single-element list', () => {
    const snapshots = dllInsertAtEngine([5], 0)
    const values = toValues(lastState(snapshots))
    expect(values[1]).toBe(5)
  })

  it('inserts at the end of a single-element list', () => {
    const snapshots = dllInsertAtEngine([5], 1)
    const values = toValues(lastState(snapshots))
    expect(values[0]).toBe(5)
  })

  it('inserts in the middle of a two-element list, keeping prev/next consistent', () => {
    const snapshots = dllInsertAtEngine([3, 7], 1)
    const state = lastState(snapshots)
    const values = toValues(state)
    expect(values[0]).toBe(3)
    expect(values[2]).toBe(7)
    expectPrevNextConsistency(state)
  })

  it('inserts at the front of a multi-element list', () => {
    const snapshots = dllInsertAtEngine([3, 7, 1, 9], 0)
    const values = toValues(lastState(snapshots))
    expect(values.slice(1)).toEqual([3, 7, 1, 9])
  })

  it('clamps an out-of-range position to the end', () => {
    const snapshots = dllInsertAtEngine([3, 7, 1], 99)
    const values = toValues(lastState(snapshots))
    expect(values.slice(0, 3)).toEqual([3, 7, 1])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllInsertAtEngine(input, 1)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags at least one INSERT_BETWEEN critical junction', () => {
    const snapshots = dllInsertAtEngine([3, 7, 1], 1)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'INSERT_BETWEEN')
    expect(junctions.length).toBe(1)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(dllInsertAtEngine([1, 2, 3], 1))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllInsertAtEngine([1, 2, 3], 1))
  })
})

describe('dllDeleteEngine', () => {
  it('handles deleting from an empty list without throwing', () => {
    const snapshots = dllDeleteEngine([], 5)
    expect(lastState(snapshots).nodes.length).toBe(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('deletes the only element of a single-element list', () => {
    const snapshots = dllDeleteEngine([5], 5)
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(0)
    expect(state.headId).toBeNull()
    expect(state.tailId).toBeNull()
  })

  it('leaves a single-element list unchanged when the target is not found', () => {
    const snapshots = dllDeleteEngine([5], 99)
    expect(toValues(lastState(snapshots))).toEqual([5])
  })

  it('deletes the front of a two-element list and keeps prev/next consistent', () => {
    const snapshots = dllDeleteEngine([3, 7], 3)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([7])
    expectPrevNextConsistency(state)
  })

  it('deletes the back of a two-element list, updating the tail', () => {
    const snapshots = dllDeleteEngine([3, 7], 7)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([3])
    expect(state.nodes.find((n) => n.id === state.tailId)!.value).toBe(3)
  })

  it('deletes a target in the middle of a multi-element list, keeping prev/next consistent', () => {
    const snapshots = dllDeleteEngine([3, 7, 1, 9], 7)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([3, 1, 9])
    expectPrevNextConsistency(state)
  })

  it('deletes the target at the back of a multi-element list', () => {
    const snapshots = dllDeleteEngine([3, 7, 1, 9], 9)
    expect(toValues(lastState(snapshots))).toEqual([3, 7, 1])
  })

  it('leaves a multi-element list unchanged when the target is not found', () => {
    const snapshots = dllDeleteEngine([3, 7, 1, 9], 99)
    expect(toValues(lastState(snapshots))).toEqual([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'DELETE_RELINK')
    expect(junctions.length).toBe(0)
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllDeleteEngine(input, 7)
    expect(input).toEqual([3, 7, 1])
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllDeleteEngine([1, 2, 3], 2))
  })
})

describe('dllSearchEngine', () => {
  it('handles searching an empty list without throwing', () => {
    const snapshots = dllSearchEngine([], 5)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('finds the target in a single-element list', () => {
    const snapshots = dllSearchEngine([5], 5)
    expect(lastState(snapshots).highlightedId).not.toBeNull()
  })

  it('reports not found in a single-element list', () => {
    const snapshots = dllSearchEngine([5], 99)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('finds a target near the tail quickly by searching backward', () => {
    const snapshots = dllSearchEngine([3, 7, 1, 9], 9)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'TRAVERSE_DIRECTION')
    expect(junctions.length).toBe(1)
  })

  it('finds a target at the front by searching all the way back', () => {
    const snapshots = dllSearchEngine([3, 7, 1, 9], 3)
    const state = lastState(snapshots)
    const found = state.nodes.find((n) => n.id === state.highlightedId)!
    expect(found.value).toBe(3)
  })

  it('reports not found for a multi-element list', () => {
    const snapshots = dllSearchEngine([3, 7, 1, 9], 99)
    expect(lastState(snapshots).highlightedId).toBeNull()
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllSearchEngine(input, 7)
    expect(input).toEqual([3, 7, 1])
  })

  it('traverses backward from the tail (activePointer is prev)', () => {
    const snapshots = dllSearchEngine([3, 7, 1], 3)
    const searchSteps = snapshots.filter((s) => s.criticalJunctionType === 'TRAVERSE_DIRECTION')
    expect(searchSteps.every((s) => (s.dataStructureState as LinkedListState).activePointer === 'prev')).toBe(true)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(dllSearchEngine([1, 2, 3], 2))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllSearchEngine([1, 2, 3], 2))
  })
})

describe('dllReverseEngine', () => {
  it('reverses an empty list (stays empty)', () => {
    expect(lastState(dllReverseEngine([])).nodes.length).toBe(0)
  })

  it('reverses a single-element list (stays the same)', () => {
    expect(toValues(lastState(dllReverseEngine([5])))).toEqual([5])
  })

  it('reverses a two-element list', () => {
    expect(toValues(lastState(dllReverseEngine([3, 7])))).toEqual([7, 3])
  })

  it('reverses a multi-element list', () => {
    expect(toValues(lastState(dllReverseEngine([3, 7, 1, 9, 4])))).toEqual([4, 9, 1, 7, 3])
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    dllReverseEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('swaps head and tail', () => {
    const snapshots = dllReverseEngine([3, 7, 1])
    const state = lastState(snapshots)
    expect(state.nodes.find((n) => n.id === state.headId)!.value).toBe(1)
    expect(state.nodes.find((n) => n.id === state.tailId)!.value).toBe(3)
  })

  it('keeps prev/next consistent after reversal', () => {
    const snapshots = dllReverseEngine([3, 7, 1, 9])
    expectPrevNextConsistency(lastState(snapshots))
  })

  it('flags one TRAVERSE_DIRECTION junction per node', () => {
    const snapshots = dllReverseEngine([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'TRAVERSE_DIRECTION')
    expect(junctions.length).toBe(4)
  })

  it('has sequential stepIndex values', () => {
    expectSequentialSteps(dllReverseEngine([1, 2, 3]))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    expectFinalStepOnlyOnLast(dllReverseEngine([1, 2, 3]))
  })
})
