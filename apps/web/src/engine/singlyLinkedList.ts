import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface LinkedListNode {
  id: string
  value: number | string
  next: string | null
  prev?: string | null
}

export interface LinkedListState {
  nodes: LinkedListNode[]
  headId: string | null
  tailId: string | null
  currentId: string | null
  highlightedId: string | null
  activePointer: 'next' | 'prev' | null
  operation: 'insert' | 'delete' | 'search' | 'traverse' | 'reverse'
  operationValue: number | null
  insertPosition: number | null
  markedForDelete: string | null
}

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
  return `sll-${value}-${idCounter++}`
}

/** A new value guaranteed distinct from every value already in the list, for the operations that demonstrate inserting "one more" node. */
function synthesizeNewValue(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1
}

function cloneNodes(nodes: LinkedListNode[]): LinkedListNode[] {
  return nodes.map((n) => ({ ...n }))
}

/**
 * Builds the initial list from `values` via plain back-insertion (no
 * critical junctions - this is setup, not the operation being taught)
 * and returns both the snapshots showing it being built and the final
 * {nodes, headId, tailId} to continue from.
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
        pseudocodeLine: 0,
        isPredictionRequired: false,
        state: emptyState(),
      }),
    )
    return { snapshots, nodes, headId, tailId }
  }

  for (const value of values) {
    const id = nextId(value)
    nodes = [...nodes, { id, value, next: null }]
    if (tailId) {
      nodes = nodes.map((n) => (n.id === tailId ? { ...n, next: id } : n))
    } else {
      headId = id
    }
    tailId = id

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndexRef.current++,
        description: `Building the list: appended ${value}.`,
        pseudocodeLine: 0,
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

// Pseudocode line indices, shared across all six operations since each
// engine only ever highlights the couple of lines relevant to it -
// PseudocodePanel maps the unused ones to plausible-but-dark text, the
// same pattern the sorting/BST engines already use.
//   0: 'build/traverse the list'
//   1: 'new.next = current head (or null if empty)'
//   2: 'head = new node'
//   3: 'traverse to find the last node (node.next == null)'
//   4: 'last.next = new node'
//   5: 'traverse to find the node before the target'
//   6: 'prev.next = target.next (relink around the deleted node)'
//   7: 'if node.value == target: found'
//   8: 'prev = null, curr = head'
//   9: 'next = curr.next; curr.next = prev; prev = curr; curr = next'
const LINE = {
  TRAVERSE: 0,
  NEW_NEXT: 1,
  UPDATE_HEAD: 2,
  FIND_LAST: 3,
  LINK_TAIL: 4,
  FIND_PREV: 5,
  RELINK: 6,
  CHECK_MATCH: 7,
  INIT_REVERSE: 8,
  REVERSE_STEP: 9,
} as const

/** Inserts `value` at the front of the list. NULL_CHECK junction on what the new node's .next becomes. */
export function sllInsertFrontEngine(values: number[]): AlgorithmSnapshot[] {
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
      description: `Creating a new node with value ${newValue}. What does its .next pointer point to?`,
      pseudocodeLine: LINE.NEW_NEXT,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: newId }),
      criticalJunctionType: CriticalJunctionType.NULL_CHECK,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const withNew = [...nodes, { id: newId, value: newValue, next: headId }]
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: headId
        ? `The new node's .next now points to the previous head. Its own .next needs to become the new head.`
        : `The list was empty, so the new node's .next is null - it is the only node.`,
      pseudocodeLine: LINE.UPDATE_HEAD,
      isPredictionRequired: false,
      state: { ...baseState(withNew, { currentId: newId, headId: newId, tailId: tailId ?? newId }) },
    }),
  )

  const finalNodes = withNew
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} inserted at the front. It is now the head of the list.`,
      pseudocodeLine: LINE.UPDATE_HEAD,
      isPredictionRequired: false,
      state: baseState(finalNodes, { headId: newId, tailId: tailId ?? newId, highlightedId: newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Appends `value` to the back of the list. NULL_CHECK while traversing to the tail, INSERT_BETWEEN when the tail's .next is updated. */
export function sllInsertBackEngine(values: number[]): AlgorithmSnapshot[] {
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
    const solo = [{ id, value: newValue, next: null }]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `The list is empty, so ${newValue} becomes both the head and the tail.`,
        pseudocodeLine: LINE.UPDATE_HEAD,
        isPredictionRequired: false,
        state: { ...baseState(solo, { headId: id, tailId: id, highlightedId: id }) },
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  // Traverse from head, asking at each node whether it is the last one.
  let cursor: string | null = headId
  while (cursor) {
    const node = nodes.find((n) => n.id === cursor)!
    const isLast = node.next === null
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}: is this the last node?`,
        pseudocodeLine: LINE.FIND_LAST,
        isPredictionRequired: true,
        state: baseState(nodes, { currentId: node.id }),
        criticalJunctionType: CriticalJunctionType.NULL_CHECK,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    if (isLast) break
    cursor = node.next
  }

  const newId = nextId(newValue)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Reached the tail (${nodes.find((n) => n.id === tailId)!.value}). After inserting ${newValue}, what does the tail's .next pointer become?`,
      pseudocodeLine: LINE.LINK_TAIL,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: tailId }),
      criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const finalNodes = nodes
    .map((n) => (n.id === tailId ? { ...n, next: newId } : n))
    .concat({ id: newId, value: newValue, next: null })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} appended. It is now the tail of the list.`,
      pseudocodeLine: LINE.LINK_TAIL,
      isPredictionRequired: false,
      state: baseState(finalNodes, { tailId: newId, highlightedId: newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Inserts a new value at `position` (0-indexed, clamped to [0, length])
 * within the list built from `values`. POINTER_FOLLOW while traversing
 * to the insertion point, INSERT_BETWEEN at the insertion itself.
 */
export function sllInsertAtEngine(values: number[], position: number): AlgorithmSnapshot[] {
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
    const finalNodes = [{ id, value: newValue, next: headId }, ...nodes]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `Inserting ${newValue} at position 0 means it becomes the new head, pointing at the old head.`,
        pseudocodeLine: LINE.UPDATE_HEAD,
        isPredictionRequired: true,
        state: baseState(finalNodes, { headId: id, highlightedId: id }),
        criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
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
        description: `At node ${node.value}: which node does .next lead to from here?`,
        pseudocodeLine: LINE.TRAVERSE,
        isPredictionRequired: true,
        state: baseState(nodes, { currentId: node.id }),
        criticalJunctionType: CriticalJunctionType.POINTER_FOLLOW,
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
      description: `Inserting ${newValue} between ${prevNode.value} and ${nextNode ? nextNode.value : 'the end'}. What must happen to link it in?`,
      pseudocodeLine: LINE.NEW_NEXT,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: prevId }),
      criticalJunctionType: CriticalJunctionType.INSERT_BETWEEN,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const finalNodes = nodes
    .map((n) => (n.id === prevId ? { ...n, next: newId } : n))
    .concat({ id: newId, value: newValue, next: cursor })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} inserted at position ${pos}.`,
      pseudocodeLine: LINE.NEW_NEXT,
      isPredictionRequired: false,
      state: baseState(finalNodes, { highlightedId: newId, tailId: cursor ? tailId : newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Deletes the first node whose value is `targetValue`. POINTER_FOLLOW
 * while searching for the node before the target, DELETE_RELINK at the
 * deletion. If the target isn't found, the list is left unchanged.
 */
export function sllDeleteEngine(values: number[], targetValue: number): AlgorithmSnapshot[] {
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
  let prevId: string | null = null
  let targetId: string | null = null

  while (cursor) {
    const node = nodes.find((n) => n.id === cursor)!
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}: is this the node to delete (${targetValue})?`,
        pseudocodeLine: LINE.FIND_PREV,
        isPredictionRequired: node.value === targetValue || node.next === null,
        state: baseState(nodes, { currentId: node.id }),
        criticalJunctionType: node.value === targetValue || node.next === null ? CriticalJunctionType.POINTER_FOLLOW : null,
        junctionDifficulty: node.value === targetValue || node.next === null ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )
    if (node.value === targetValue) {
      targetId = node.id
      break
    }
    prevId = cursor
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
      description: prevId
        ? `To delete ${targetValue}, what must happen to node ${nodes.find((n) => n.id === prevId)!.value}'s .next pointer?`
        : `${targetValue} is the head. What must the new head become?`,
      pseudocodeLine: LINE.RELINK,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: targetId, markedForDelete: targetId }),
      criticalJunctionType: CriticalJunctionType.DELETE_RELINK,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const finalNodes = nodes
    .filter((n) => n.id !== targetId)
    .map((n) => (n.id === prevId ? { ...n, next: targetNode.next } : n))
  const newHeadId = prevId ? headId : targetNode.next
  const newTailId = targetId === tailId ? prevId : tailId

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${targetValue} deleted. The list is now relinked around it.`,
      pseudocodeLine: LINE.RELINK,
      isPredictionRequired: false,
      state: baseState(finalNodes, { headId: newHeadId, tailId: newTailId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Searches for `target` by traversal. POINTER_FOLLOW at each step. */
export function sllSearchEngine(values: number[], target: number): AlgorithmSnapshot[] {
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
    activePointer: null,
    operation: 'search',
    operationValue: target,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  })

  let cursor: string | null = headId
  let found = false

  while (cursor) {
    const node = nodes.find((n) => n.id === cursor)!
    const isMatch = node.value === target
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}: does this match the target ${target}?`,
        pseudocodeLine: LINE.CHECK_MATCH,
        isPredictionRequired: true,
        state: baseState({ currentId: node.id }),
        criticalJunctionType: CriticalJunctionType.POINTER_FOLLOW,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )
    if (isMatch) {
      found = true
      break
    }
    cursor = node.next
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: found ? `Found ${target} in the list.` : `Reached the end of the list. ${target} was not found.`,
      pseudocodeLine: LINE.CHECK_MATCH,
      isPredictionRequired: false,
      state: baseState({ highlightedId: found ? cursor : null }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/** Reverses the list in place using the classic prev/curr/next three-pointer technique. POINTER_FOLLOW at each rewiring step. */
export function sllReverseEngine(values: number[]): AlgorithmSnapshot[] {
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
    // 0 or 1 nodes: already "reversed".
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
      description: 'Reversing the list: prev starts at null, curr starts at the head.',
      pseudocodeLine: LINE.INIT_REVERSE,
      isPredictionRequired: false,
      state: baseState(nodes, { currentId: headId }),
    }),
  )

  // Work on a plain (id -> next) map since a full reversal rewires
  // every node's .next, which the LinkedListNode[] shape can represent
  // just as well but is easier to mutate through a Map mid-pass.
  const nextOf = new Map<string, string | null>(nodes.map((n) => [n.id, n.next]))
  let prevId: string | null = null
  let currId: string | null = headId

  while (currId) {
    const currValue = nodes.find((n) => n.id === currId)!.value
    const followingId: string | null = nextOf.get(currId) ?? null

    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${currValue}: after reversing, where should this node's .next pointer go?`,
        pseudocodeLine: LINE.REVERSE_STEP,
        isPredictionRequired: true,
        state: baseState(
          nodes.map((n) => ({ ...n, next: nextOf.get(n.id) ?? null })),
          { currentId: currId, activePointer: 'next' },
        ),
        criticalJunctionType: CriticalJunctionType.POINTER_FOLLOW,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    nextOf.set(currId, prevId)
    prevId = currId
    currId = followingId
  }

  const finalNodes = nodes.map((n) => ({ ...n, next: nextOf.get(n.id) ?? null }))
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
