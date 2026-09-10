import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
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
  return `cll-${value}-${idCounter++}`
}

function synthesizeNewValue(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1
}

function cloneNodes(nodes: LinkedListNode[]): LinkedListNode[] {
  return nodes.map((n) => ({ ...n }))
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

// insert(value): append, then relink tail.next back to head (never null)
//   0: 'build/traverse the list'
//   1: 'new.next = head (close the circle)'
//   2: 'old tail.next = new node'
//   3: 'traverse: node = node.next'
//   4: 'stop when node == head (not when node == null)'
//   5: 'prev.next = target.next (relink around the deleted node, still circular)'
const LINE = {
  TRAVERSE: 0,
  CLOSE_CIRCLE: 1,
  LINK_TAIL: 2,
  ADVANCE: 3,
  WRAP_STOP: 4,
  DELETE_RELINK: 5,
} as const

/**
 * Builds the circular list from `values` via back-insertion, keeping
 * the tail->head link intact after every single insertion (not just
 * at the end) so every intermediate snapshot is already a valid
 * circular list, not a linear one that becomes circular only at the
 * very last step.
 */
function buildCircularList(
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
    nodes = [...nodes, { id, value, next: id }]
    if (prevTailId) {
      nodes = nodes.map((n) => (n.id === prevTailId ? { ...n, next: id } : n))
    } else {
      headId = id
    }
    tailId = id
    // Close the circle: the new tail's .next always points back to head.
    nodes = nodes.map((n) => (n.id === tailId ? { ...n, next: headId } : n))

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndexRef.current++,
        description: `Building the list: appended ${value}. Its .next closes the circle back to the head (${nodes.find((n) => n.id === headId)!.value}).`,
        pseudocodeLine: LINE.CLOSE_CIRCLE,
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

/**
 * Demonstrates inserting one more value at the back of a circular
 * list. WRAP_CHECK junction on what the (new) last node's .next
 * points to - the answer is always the head, never null.
 */
export function cllInsertEngine(values: number[]): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildCircularList(values, stepRef)
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
    const solo = [{ id, value: newValue, next: id }]
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `The list is empty, so ${newValue} becomes the only node - its own .next points to itself.`,
        pseudocodeLine: LINE.CLOSE_CIRCLE,
        isPredictionRequired: false,
        state: baseState(solo, { headId: id, tailId: id, highlightedId: id }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const newId = nextId(newValue)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Inserting ${newValue} after the current tail (${nodes.find((n) => n.id === tailId)!.value}). What does the last node's .next pointer point to in a circular list?`,
      pseudocodeLine: LINE.LINK_TAIL,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: tailId }),
      criticalJunctionType: CriticalJunctionType.WRAP_CHECK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    }),
  )

  const finalNodes = nodes
    .map((n) => (n.id === tailId ? { ...n, next: newId } : n))
    .concat({ id: newId, value: newValue, next: headId })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${newValue} inserted as the new tail. Its .next closes the circle back to the head.`,
      pseudocodeLine: LINE.CLOSE_CIRCLE,
      isPredictionRequired: false,
      state: baseState(finalNodes, { tailId: newId, highlightedId: newId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Deletes the first node whose value is `targetValue`, keeping the
 * circle intact (relinking around the deleted node, and re-closing
 * the tail->head link if the tail or head itself was deleted).
 */
export function cllDeleteEngine(values: number[], targetValue: number): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildCircularList(values, stepRef)
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
        pseudocodeLine: LINE.DELETE_RELINK,
        isPredictionRequired: false,
        state: baseState(nodes),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  // A single self-pointing node deleting itself.
  if (headId === tailId && nodes[0].value === targetValue) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `${targetValue} is the only node. Deleting it leaves the list empty.`,
        pseudocodeLine: LINE.DELETE_RELINK,
        isPredictionRequired: false,
        state: baseState([], { headId: null, tailId: null }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let cursor: string | null = headId
  let prevId: string | null = null
  let targetId: string | null = null
  let steps = 0
  const n = nodes.length

  while (steps < n) {
    const node = nodes.find((nd) => nd.id === cursor)!
    const isBackAtHead = steps > 0 && node.id === headId
    if (isBackAtHead) break

    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `At node ${node.value}: is this the node to delete (${targetValue})?`,
        pseudocodeLine: LINE.ADVANCE,
        isPredictionRequired: node.value === targetValue,
        state: baseState(nodes, { currentId: node.id }),
        criticalJunctionType: node.value === targetValue ? CriticalJunctionType.WRAP_CHECK : null,
        junctionDifficulty: node.value === targetValue ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )

    if (node.value === targetValue) {
      targetId = node.id
      break
    }
    prevId = cursor
    cursor = node.next
    steps++
  }

  if (!targetId) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: `Traversed the full circle back to the head without finding ${targetValue}. Nothing was deleted.`,
        pseudocodeLine: LINE.WRAP_STOP,
        isPredictionRequired: false,
        state: baseState(nodes),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  const targetNode = nodes.find((nd) => nd.id === targetId)!
  const effectivePrevId = prevId ?? tailId! // deleting the head: the real predecessor is the tail

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Deleting ${targetValue}: node ${nodes.find((nd) => nd.id === effectivePrevId)!.value}'s .next must relink around it, staying circular.`,
      pseudocodeLine: LINE.DELETE_RELINK,
      isPredictionRequired: true,
      state: baseState(nodes, { currentId: targetId, markedForDelete: targetId }),
      criticalJunctionType: CriticalJunctionType.DELETE_RELINK,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const newHeadId = targetId === headId ? targetNode.next : headId
  const newTailId = targetId === tailId ? effectivePrevId : tailId
  const finalNodes = nodes
    .filter((nd) => nd.id !== targetId)
    .map((nd) => (nd.id === effectivePrevId ? { ...nd, next: targetNode.next } : nd))

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `${targetValue} deleted. The circle stays closed: the list still has no null terminator.`,
      pseudocodeLine: LINE.DELETE_RELINK,
      isPredictionRequired: false,
      state: baseState(finalNodes, { headId: newHeadId, tailId: newTailId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Traverses the full circle starting and ending at the head.
 * NULL_CHECK junction on how termination is detected - by returning
 * to the head, never by finding a null pointer.
 */
export function cllTraverseEngine(values: number[]): AlgorithmSnapshot[] {
  const stepRef = { current: 0 }
  const built = buildCircularList(values, stepRef)
  const snapshots = built.snapshots
  const { nodes, headId, tailId } = built

  const baseState = (overrides: Partial<LinkedListState> = {}): LinkedListState => ({
    nodes: cloneNodes(nodes),
    headId,
    tailId,
    currentId: null,
    highlightedId: null,
    activePointer: null,
    operation: 'traverse',
    operationValue: null,
    insertPosition: null,
    markedForDelete: null,
    ...overrides,
  })

  if (!headId) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description: 'The list is empty - there is nothing to traverse.',
        pseudocodeLine: LINE.WRAP_STOP,
        isPredictionRequired: false,
        state: baseState(),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let cursor: string | null = headId
  let steps = 0
  const n = nodes.length

  while (steps < n) {
    const node = nodes.find((nd) => nd.id === cursor)!
    snapshots.push(
      makeSnapshot({
        stepIndex: stepRef.current++,
        description:
          steps === n - 1
            ? `At node ${node.value}, the last unvisited node. How do we know when traversal is complete in a circular list?`
            : `Visiting node ${node.value} (visit ${steps + 1} of ${n}).`,
        pseudocodeLine: steps === n - 1 ? LINE.WRAP_STOP : LINE.ADVANCE,
        isPredictionRequired: steps === n - 1,
        state: baseState({ currentId: node.id }),
        criticalJunctionType: steps === n - 1 ? CriticalJunctionType.NULL_CHECK : null,
        junctionDifficulty: steps === n - 1 ? JunctionDifficulty.CONCEPTUAL : null,
      }),
    )
    cursor = node.next
    steps++
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepRef.current++,
      description: `Back at the head (${nodes.find((nd) => nd.id === headId)!.value}). All ${n} node${n === 1 ? '' : 's'} visited - traversal complete.`,
      pseudocodeLine: LINE.WRAP_STOP,
      isPredictionRequired: false,
      state: baseState({ highlightedId: headId }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
