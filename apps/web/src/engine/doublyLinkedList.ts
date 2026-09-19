import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { LinkedListNode, LinkedListState } from './singlyLinkedList'

export type { LinkedListNode, LinkedListState }

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: LinkedListState
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
    canvasType: CanvasType.LINKED_LIST,
    dataStructureState: { ...params.state, nodes: params.state.nodes.map((n) => ({ ...n })) },
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
  return `dll-${value}-${idCounter++}`
}

function synthesizeNewValue(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1
}

function cloneNodes(nodes: LinkedListNode[]): LinkedListNode[] {
  return nodes.map((n) => ({ ...n }))
}

// insert(A, B, value): if root is null: create node - see LINE below
//   0: 'build/traverse the list'
//   1: 'new.next = B, new.prev = A'
//   2: 'A.next = new, B.prev = new (both directions relinked)'
//   3: 'traverse forward/backward'
//   4: 'prev.next = target.next, target.next.prev = prev (relink both directions)'
//   5: 'if node.value == target: found'
//   6: 'prev = null, curr = head, next = null'
//   7: 'next = curr.next; curr.next = prev; curr.prev = next; prev = curr; curr = next'
const LINE = {
  TRAVERSE: 0,
  NEW_LINKS: 1,
  RELINK_BOTH: 2,
  FIND_POSITION: 3,
  DELETE_RELINK_BOTH: 4,
  CHECK_MATCH: 5,
  INIT_REVERSE: 6,
  REVERSE_STEP: 7,
} as const

/**
 * Builds the initial doubly linked list from `values` via plain
 * back-insertion (both next and prev wired), no critical junctions -
 * this is setup, not the operation being taught.
 */
function buildInitialList(
  values: number[],
  stepIndexRef: { current: number },
): { snapshots: AlgorithmSnapshot[]; nodes: LinkedListNode[]; headId: string | null; tailId: string | null } {
  const snapshots: AlgorithmSnapshot[] = []
  let nodes: LinkedListNode[] = []
  let headId: string | null = null
  let tailId: string | null = null

  if (values.length === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndexRef.current++,
        description: 'Starting with an empty list.',
        pseudocodeLine: LINE.TRAVERSE,
        isPredictionRequired: false,
        state: emptyState(),
      }),
    )
    return { snapshots, nodes, headId, tailId }
  }

  for (const value of values) {
    const id = nextId(value)
    const prevTailId = tailId
    nodes = [...nodes, { id, value, next: null, prev: prevTailId }]
    if (prevTailId) {
      nodes = nodes.map((n) => (n.id === prevTailId ? { ...n, next: id } : n))
    } else {
      headId = id
    }
    tailId = id

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndexRef.current++,
        description: `Building the list: appended ${value}.`,
        pseudocodeLine: LINE.TRAVERSE,
        isPredictionRequired: false,
        state: {
          nodes: cloneNodes(nodes),
          headId,
          tailId,
          currentId: id,
          highlightedId: null,
          activePointer: null,
          operation: 'insert',
          operationValue: value,
          insertPosition: null,
          markedForDelete: null,
        },
      }),
    )
  }

  return { snapshots, nodes, headId, tailId }
}

function emptyState(overrides: Partial<LinkedListState> = {}): LinkedListState {
  return {
    nodes: [],
    headId: null,
    tailId: null,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'traverse',
    operationValue: null,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  }
}

/** Inserts a new value at the front. INSERT_BETWEEN junction on which two pointers must be updated (new.next/new.prev and old head's prev). */
export function dllInsertFrontEngine(values: number[]): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built
  const newValue = synthesizeNewValue(values)

  const baseState = (n: LinkedListNode[], overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(n),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'insert',
    operationValue: newValue,
    insertPosition: 0,
    markedForDelete: null,
    ...overrides,
  })

  const newId = nextId(newValue)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Inserting ${newValue} at the front. After inserting, which TWO pointers change?`,
      pseudocodeLine: LINE.NEW_LINKS,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: newId }),
      criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const withNew: LinkedListNode[] = [
    { id: newId, value: newValue, next: headId, prev: null },
    ...nodes.map((n) => (n.id === headId ? { ...n, prev: newId } : n)),
  ]

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} inserted. Its .next points to the old head, and the old head's .prev now points back to it.`,
      pseudocodeLine: LINE.RELINK_BOTH,
      isPredictionRequired: false,
      state: baseState(withNew, { headId: newId, tailId: tailId ?? newId, highlightedId: newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Appends a new value to the back. TRAVERSE_DIRECTION and INSERT_BETWEEN junctions. */
export function dllInsertBackEngine(values: number[]): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built
  const newValue = synthesizeNewValue(values)

  const baseState = (n: LinkedListNode[], overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(n),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'insert',
    operationValue: newValue,
    insertPosition: nodes.length,
    markedForDelete: null,
    ...overrides,
  })

  if (!headId) {
    const id = nextId(newValue)
    const solo = [{ id, value: newValue, next: null, prev: null }]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `The list is empty, so ${newValue} becomes both head and tail.`,
        pseudocodeLine: LINE.RELINK_BOTH,
        isPredictionRequired: false,
        state: { ...baseState(solo, { headId: id, tailId: id, highlightedId: id }) },
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const newId = nextId(newValue)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `The tail pointer already gives direct access to the last node (${nodes.find((n) => n.id === tailId)!.value}) - no traversal needed with a maintained tail pointer. After appending ${newValue}, which TWO pointers change?`,
      pseudocodeLine: LINE.NEW_LINKS,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: tailId }),
      criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const finalNodes = nodes
    .map((n) => (n.id === tailId ? { ...n, next: newId } : n))
    .concat({ id: newId, value: newValue, next: null, prev: tailId })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} appended. The old tail's .next points to it, and its own .prev points back to the old tail.`,
      pseudocodeLine: LINE.RELINK_BOTH,
      isPredictionRequired: false,
      state: baseState(finalNodes, { tailId: newId, highlightedId: newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Inserts a new value at `position`. TRAVERSE_DIRECTION while locating it, INSERT_BETWEEN at the insertion. */
export function dllInsertAtEngine(values: number[], position: number): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built
  const newValue = synthesizeNewValue(values)
  const pos = Math.max(0, Math.min(position, nodes.length))

  const baseState = (n: LinkedListNode[], overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(n),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'insert',
    operationValue: newValue,
    insertPosition: pos,
    markedForDelete: null,
    ...overrides,
  })

  if (pos === 0) {
    const id = nextId(newValue)
    const finalNodes: LinkedListNode[] = [
      { id, value: newValue, next: headId, prev: null },
      ...nodes.map((n) => (n.id === headId ? { ...n, prev: id } : n)),
    ]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `Inserting ${newValue} at position 0 makes it the new head. After inserting, which TWO pointers change?`,
        pseudocodeLine: LINE.RELINK_BOTH,
        isPredictionRequired: true,
        state: baseState(nodes, { currentId: id }),
        criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `${newValue} inserted. Its .next points to the old head, and the old head's .prev now points back to it.`,
        pseudocodeLine: LINE.RELINK_BOTH,
        isPredictionRequired: false,
        state: baseState(finalNodes, { headId: id, highlightedId: id }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let cursor: string | null = headId
  let prevId: string | null = null
  for (let i = 0; i < pos && cursor; i++) {
    const node = nodes.find((n) => n.id === cursor)!
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}, traversing forward: which node does .next lead to?`,
        pseudocodeLine: LINE.FIND_POSITION,
        isPredictionRequired: true,
        state: baseState(nodes, { currentId: node.id, activePointer: 'next' }),
        criticalJunctionType: CriticalJunctionType.TRAVERSE_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    prevId = cursor
    cursor = node.next
  }

  const prevNode = nodes.find((n) => n.id === prevId)!
  const nextNode = cursor ? nodes.find((n) => n.id === cursor) : null
  const newId = nextId(newValue)

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Inserting ${newValue} between ${prevNode.value} and ${nextNode ? nextNode.value : 'the end'}. After inserting between A and B, which TWO pointers change?`,
      pseudocodeLine: LINE.NEW_LINKS,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: prevId }),
      criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const finalNodes = nodes
    .map((n) => {
      if (n.id === prevId) return { ...n, next: newId }
      if (cursor && n.id === cursor) return { ...n, prev: newId }
      return n
    })
    .concat({ id: newId, value: newValue, next: cursor, prev: prevId })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} inserted at position ${pos}, linked in both directions.`,
      pseudocodeLine: LINE.RELINK_BOTH,
      isPredictionRequired: false,
      state: baseState(finalNodes, { highlightedId: newId, tailId: cursor ? tailId : newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Deletes the first node whose value is `targetValue`. DELETE_RELINK junction asks how many pointers must be updated (2: prev.next and next.prev). */
export function dllDeleteEngine(values: number[], targetValue: number): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built

  const baseState = (n: LinkedListNode[], overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(n),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'delete',
    operationValue: targetValue,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  })

  if (!headId) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `The list is empty - ${targetValue} cannot be deleted.`,
        pseudocodeLine: LINE.CHECK_MATCH,
        isPredictionRequired: false,
        state: baseState(nodes),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let cursor: string | null = headId
  let targetId: string | null = null

  while (cursor) {
    const node = nodes.find((n) => n.id === cursor)!
    const isLast = node.next === null
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}: is this the node to delete (${targetValue})?`,
        pseudocodeLine: LINE.FIND_POSITION,
        isPredictionRequired: node.value === targetValue || isLast,
        state: baseState(nodes, { currentId: node.id }),
        criticalJunctionType: node.value === targetValue || isLast ? CriticalJunctionType.TRAVERSE_DIRECTION : null,
        junctionDifficulty: node.value === targetValue || isLast ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )
    if (node.value === targetValue) {
      targetId = node.id
      break
    }
    cursor = node.next
  }

  if (!targetId) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `Reached the end of the list without finding ${targetValue}. Nothing was deleted.`,
        pseudocodeLine: LINE.CHECK_MATCH,
        isPredictionRequired: false,
        state: baseState(nodes),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const targetNode = nodes.find((n) => n.id === targetId)!
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Deleting node ${targetValue} requires updating how many pointers?`,
      pseudocodeLine: LINE.DELETE_RELINK_BOTH,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: targetId, markedForDelete: targetId }),
      criticalJunctionType: CriticalJunctionType.DELETE_RELINK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  const finalNodes = nodes
    .filter((n) => n.id !== targetId)
    .map((n) => {
      if (targetNode.prev && n.id === targetNode.prev) return { ...n, next: targetNode.next }
      if (targetNode.next && n.id === targetNode.next) return { ...n, prev: targetNode.prev ?? null }
      return n
    })
  const newHeadId = targetNode.prev ? headId : targetNode.next
  const newTailId = targetId === tailId ? (targetNode.prev ?? null) : tailId

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${targetValue} deleted. Its neighbours' .next and .prev pointers now point around it.`,
      pseudocodeLine: LINE.DELETE_RELINK_BOTH,
      isPredictionRequired: false,
      state: baseState(finalNodes, { headId: newHeadId, tailId: newTailId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Searches for `target` by traversing backward from the tail - the direction a doubly linked list can search that a singly linked list cannot. TRAVERSE_DIRECTION at each step. */
export function dllSearchEngine(values: number[], target: number): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built

  const baseState = (overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(nodes),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: 'prev',
    operation: 'search',
    operationValue: target,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  })

  let cursor: string | null = tailId
  let found = false

  while (cursor) {
    const node = nodes.find((n) => n.id === cursor)!
    const isMatch = node.value === target
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `Traversing backward from the tail, at node ${node.value}: following .prev, which node do we reach next?`,
        pseudocodeLine: LINE.CHECK_MATCH,
        isPredictionRequired: true,
        state: baseState({ currentId: node.id }),
        criticalJunctionType: CriticalJunctionType.TRAVERSE_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    if (isMatch) {
      found = true
      break
    }
    cursor = node.prev ?? null
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: found
        ? `Found ${target} while searching backward from the tail.`
        : `Reached the head without finding ${target}.`,
      pseudocodeLine: LINE.CHECK_MATCH,
      isPredictionRequired: false,
      state: baseState({ highlightedId: found ? cursor : null }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Reverses the list in place, swapping every node's next/prev. POINTER_FOLLOW-adjacent TRAVERSE_DIRECTION at each rewiring step. */
export function dllReverseEngine(values: number[]): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildInitialList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built

  const baseState = (n: LinkedListNode[], overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(n),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'reverse',
    operationValue: null,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  })

  if (!headId || !nodes.find((n) => n.id === headId)?.next) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: nodes.length <= 1 ? 'A list of 0 or 1 nodes is already its own reverse.' : 'Reversal complete.',
        pseudocodeLine: LINE.INIT_REVERSE,
        isPredictionRequired: false,
        state: baseState(nodes),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: 'Reversing the list: for every node, .next and .prev swap places.',
      pseudocodeLine: LINE.INIT_REVERSE,
      isPredictionRequired: false,
      state: baseState(nodes, { currentId: headId }),
    }),
  )

  const nextOf = new Map<string, string | null>(nodes.map((n) => [n.id, n.next]))
  const prevOf = new Map<string, string | null>(nodes.map((n) => [n.id, n.prev ?? null]))
  let currId: string | null = headId

  while (currId) {
    const currValue = nodes.find((n) => n.id === currId)!.value
    const followingId: string | null = nextOf.get(currId) ?? null

    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${currValue}: after reversing, its .next and .prev swap. Which node does the new .next now point to?`,
        pseudocodeLine: LINE.REVERSE_STEP,
        isPredictionRequired: true,
        state: baseState(
          nodes.map((n) => ({ ...n, next: nextOf.get(n.id) ?? null, prev: prevOf.get(n.id) ?? null })),
          { currentId: currId, activePointer: 'next' },
        ),
        criticalJunctionType: CriticalJunctionType.TRAVERSE_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    const oldNext = nextOf.get(currId) ?? null
    const oldPrev = prevOf.get(currId) ?? null
    nextOf.set(currId, oldPrev)
    prevOf.set(currId, oldNext)
    currId = followingId
  }

  const finalNodes = nodes.map((n) => ({ ...n, next: nextOf.get(n.id) ?? null, prev: prevOf.get(n.id) ?? null }))
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Reversal complete. The old tail (${nodes.find((n) => n.id === tailId)!.value}) is now the head.`,
      pseudocodeLine: LINE.REVERSE_STEP,
      isPredictionRequired: false,
      state: baseState(finalNodes, { headId: tailId, tailId: headId, highlightedId: tailId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
