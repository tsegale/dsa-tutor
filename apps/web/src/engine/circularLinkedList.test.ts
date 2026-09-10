import { describe, it, expect } from 'vitest'
import { cllInsertEngine, cllDeleteEngine, cllTraverseEngine, type LinkedListState } from './circularLinkedList'

type Snapshots = ReturnType<typeof cllInsertEngine>

function lastState(snapshots: Snapshots): LinkedListState {
  return snapshots[snapshots.length - 1].dataStructureState as LinkedListState
}

/** Walks the circle starting at head, stopping when we return to head (or after n+1 safety steps to avoid an infinite loop on a broken link). */
function toValues(state: LinkedListState): (number | string)[] {
  if (!state.headId) return []
  const byId = new Map(state.nodes.map((n) => [n.id, n]))
  const values: (number | string)[] = []
  let cursor: string | null = state.headId
  let steps = 0
  do {
    const node = byId.get(cursor!)
    if (!node) break
    values.push(node.value)
    cursor = node.next
    steps++
  } while (cursor !== state.headId && steps <= state.nodes.length)
  return values
}

/** Every node's .next must point somewhere in the list - never null - and the tail's .next must be the head. */
function expectCircular(state: LinkedListState) {
  const ids = new Set(state.nodes.map((n) => n.id))
  for (const node of state.nodes) {
    expect(node.next).not.toBeNull()
    expect(ids.has(node.next!)).toBe(true)
  }
  if (state.tailId) {
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(tail.next).toBe(state.headId)
  }
}

describe('cllInsertEngine', () => {
  it('inserts into an empty list, self-linking', () => {
    const snapshots = cllInsertEngine([])
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(1)
    expect(state.nodes[0].next).toBe(state.nodes[0].id)
  })

  it('inserts into a single-element list', () => {
    const snapshots = cllInsertEngine([5])
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([5, expect.any(Number)])
    expectCircular(state)
  })

  it('inserts into a two-element list', () => {
    const snapshots = cllInsertEngine([3, 7])
    const state = lastState(snapshots)
    expect(toValues(state).slice(0, 2)).toEqual([3, 7])
    expectCircular(state)
  })

  it('inserts into a multi-element list, preserving order', () => {
    const snapshots = cllInsertEngine([3, 7, 1, 9])
    const state = lastState(snapshots)
    expect(toValues(state).slice(0, 4)).toEqual([3, 7, 1, 9])
    expectCircular(state)
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    cllInsertEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('flags exactly one WRAP_CHECK critical junction', () => {
    const snapshots = cllInsertEngine([3, 7])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'WRAP_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('the new tail always closes the circle back to head, never null', () => {
    const snapshots = cllInsertEngine([3, 7, 1])
    const state = lastState(snapshots)
    const tail = state.nodes.find((n) => n.id === state.tailId)!
    expect(tail.next).toBe(state.headId)
  })

  it('keeps the list circular at every intermediate build step', () => {
    const snapshots = cllInsertEngine([3, 7, 1, 9])
    for (const snapshot of snapshots) {
      expectCircular(snapshot.dataStructureState as LinkedListState)
    }
  })

  it('has sequential stepIndex values', () => {
    const snapshots = cllInsertEngine([1, 2, 3])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = cllInsertEngine([1, 2, 3])
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('cllDeleteEngine', () => {
  it('handles deleting from an empty list without throwing', () => {
    const snapshots = cllDeleteEngine([], 5)
    expect(lastState(snapshots).nodes.length).toBe(0)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('deletes the only element of a single-element list', () => {
    const snapshots = cllDeleteEngine([5], 5)
    const state = lastState(snapshots)
    expect(state.nodes.length).toBe(0)
    expect(state.headId).toBeNull()
  })

  it('leaves a single-element list unchanged when the target is not found', () => {
    const snapshots = cllDeleteEngine([5], 99)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([5])
    expectCircular(state)
  })

  it('deletes the head of a multi-element list, keeping it circular', () => {
    const snapshots = cllDeleteEngine([3, 7, 1, 9], 3)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([7, 1, 9])
    expectCircular(state)
  })

  it('deletes the tail of a multi-element list, relinking the new tail to head', () => {
    const snapshots = cllDeleteEngine([3, 7, 1, 9], 9)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([3, 7, 1])
    expectCircular(state)
  })

  it('deletes a middle node, keeping the circle intact', () => {
    const snapshots = cllDeleteEngine([3, 7, 1, 9], 7)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([3, 1, 9])
    expectCircular(state)
  })

  it('deletes from a two-element list, leaving a valid self-linked single node', () => {
    const snapshots = cllDeleteEngine([3, 7], 3)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([7])
    const only = state.nodes[0]
    expect(only.next).toBe(only.id)
  })

  it('leaves a multi-element list unchanged when the target is not found', () => {
    const snapshots = cllDeleteEngine([3, 7, 1, 9], 99)
    const state = lastState(snapshots)
    expect(toValues(state)).toEqual([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'DELETE_RELINK')
    expect(junctions.length).toBe(0)
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    cllDeleteEngine(input, 7)
    expect(input).toEqual([3, 7, 1])
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = cllDeleteEngine([1, 2, 3], 2)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('cllTraverseEngine', () => {
  it('handles traversing an empty list without throwing', () => {
    const snapshots = cllTraverseEngine([])
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('traverses a single-element list back to itself', () => {
    const snapshots = cllTraverseEngine([5])
    const state = lastState(snapshots)
    expect(state.highlightedId).toBe(state.headId)
  })

  it('traverses a two-element list, visiting both nodes', () => {
    const snapshots = cllTraverseEngine([3, 7])
    const visited = snapshots.filter((s) => {
      const state = s.dataStructureState as LinkedListState
      return state.operation === 'traverse' && state.currentId !== null
    })
    expect(visited.length).toBe(2)
  })

  it('traverses a multi-element list, visiting every node exactly once', () => {
    const snapshots = cllTraverseEngine([3, 7, 1, 9])
    const visitedIds = new Set(
      snapshots
        .map((s) => (s.dataStructureState as LinkedListState).currentId)
        .filter((id): id is string => id !== null),
    )
    expect(visitedIds.size).toBe(4)
  })

  it('flags exactly one NULL_CHECK critical junction, on the last node before wrapping', () => {
    const snapshots = cllTraverseEngine([3, 7, 1, 9])
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'NULL_CHECK')
    expect(junctions.length).toBe(1)
  })

  it('ends back at the head', () => {
    const snapshots = cllTraverseEngine([3, 7, 1])
    const state = lastState(snapshots)
    expect(state.highlightedId).toBe(state.headId)
  })

  it('never mutates the original input array', () => {
    const input = [3, 7, 1]
    cllTraverseEngine(input)
    expect(input).toEqual([3, 7, 1])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = cllTraverseEngine([1, 2, 3])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = cllTraverseEngine([1, 2, 3])
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })

  it('never produces a null .next on any node throughout traversal', () => {
    const snapshots = cllTraverseEngine([3, 7, 1, 9])
    for (const snapshot of snapshots) {
      expectCircular(snapshot.dataStructureState as LinkedListState)
    }
  })
})
