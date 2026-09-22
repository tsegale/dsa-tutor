import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface BSTNode {
  value: number
  left: BSTNode | null
  right: BSTNode | null
  /** Unique identifier (e.g. 'node-5-2') so the canvas can track a
   * node's position even when duplicate values are allowed. */
  id: string
}

export interface BSTState {
  root: BSTNode | null
  currentNode: BSTNode | null
  targetValue: number
  /** ids of nodes visited so far during this traversal. */
  path: string[]
  insertedValue?: number
  foundNode?: BSTNode | null
  operation: 'insert' | 'search' | 'delete'
  /** Only set on the "reached an empty position" insert snapshot
   * (currentNode is null there, so there is nothing left to compare
   * against) - null for a root insertion, otherwise the parent's value,
   * so the tile builder and the backend evaluator can both word and grade
   * that step without ever referencing currentNode.value. */
  insertionParentValue?: number | null
}

// Indices match the pseudocode panel's bst array exactly:
//   0: 'insert(root, value):'
//   1: '  if root is null: create node'
//   2: '  if value < root.value:'
//   3: '    insert(root.left, value)'
//   4: '  else if value > root.value:'
//   5: '    insert(root.right, value)'
//   6: '  else: duplicate, ignore'
//   7: 'delete: leaf or one child - replace node with its child (or null)'
//   8: 'delete: two children - copy in-order successor value, delete successor'
const PSEUDOCODE_LINE = {
  START: 0,
  CHECK_NULL: 1,
  COMPARE_LESS: 2,
  RECURSE_LEFT: 3,
  COMPARE_GREATER: 4,
  RECURSE_RIGHT: 5,
  DUPLICATE: 6,
  DELETE_SIMPLE: 7,
  DELETE_SUCCESSOR: 8,
} as const

function cloneNode(node: BSTNode | null): BSTNode | null {
  if (!node) return null
  return { value: node.value, id: node.id, left: cloneNode(node.left), right: cloneNode(node.right) }
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: BSTState
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
    dataStructureState: {
      ...params.state,
      root: cloneNode(params.state.root),
      currentNode: cloneNode(params.state.currentNode),
      path: [...params.state.path],
      foundNode: params.state.foundNode !== undefined ? cloneNode(params.state.foundNode) : undefined,
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    // Explicit (rather than relying on CanvasContainer's algorithmSlug ===
    // 'bst' fallback) so bst-search and bst-delete, which don't match that
    // slug, still render on TreeCanvas instead of falling back to ARRAY.
    canvasType: CanvasType.TREE,
  }
}

/**
 * Single source of truth for every BST page's starting tree and default
 * operation target - the registry's defaultInput/defaultTarget, the
 * sidebar's seeded search/delete base, and each control's own input
 * default all read from these so the guidance text, the seeded tree, and
 * the value shown in the input can never drift apart again.
 */
export const BST_DEFAULT_SEED = [8, 4, 12, 2, 6, 10, 14]
export const BST_DEFAULT_SEARCH_TARGET = 6
export const BST_DEFAULT_DELETE_TARGET = 4
// Not present in BST_DEFAULT_SEED, and larger than every value in it - an
// unambiguous "new value" default for the Insert control, never mistaken
// for a value the seeded demo sequence is currently narrating.
export const BST_DEFAULT_INSERT_VALUE = 20

/**
 * Pure snapshot engine for BST insertion. Inserts each value in
 * `values` one at a time, producing a BST_DIRECTION snapshot for every
 * node compared along the way (including the empty slot the value is
 * ultimately inserted into), for every insertion. Duplicate values
 * follow the standard convention of going right. Never mutates its
 * own tree across calls - each call starts from an empty tree.
 */
export function bstInsertEngine(values: number[]): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let root: BSTNode | null = null
  let idCounter = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  values.forEach((value, valueIndex) => {
    const isLastValue = valueIndex === values.length - 1
    const path: string[] = []
    let node = root
    let parent: BSTNode | null = null
    let wentLeft = false

    while (node !== null) {
      path.push(node.id)
      const isDuplicate = value === node.value
      push({
        description: `At node ${node.value}: is ${value} smaller or larger?`,
        pseudocodeLine: isDuplicate
          ? PSEUDOCODE_LINE.DUPLICATE
          : value < node.value
            ? PSEUDOCODE_LINE.COMPARE_LESS
            : PSEUDOCODE_LINE.COMPARE_GREATER,
        isPredictionRequired: true,
        state: { root, currentNode: node, targetValue: value, path, operation: 'insert' },
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })

      parent = node
      if (value < node.value) {
        wentLeft = true
        node = node.left
      } else {
        wentLeft = false
        node = node.right
      }
    }

    push({
      description:
        parent === null
          ? `The tree is empty. Insert ${value} here as the root.`
          : `Reached an empty position to the ${wentLeft ? 'left' : 'right'} of node ${parent.value}. Insert ${value} here.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_NULL,
      isPredictionRequired: true,
      state: {
        root,
        currentNode: null,
        targetValue: value,
        path,
        operation: 'insert',
        insertionParentValue: parent === null ? null : parent.value,
      },
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    const newNode: BSTNode = { value, left: null, right: null, id: `node-${value}-${idCounter++}` }
    if (parent === null) {
      root = newNode
    } else if (wentLeft) {
      parent.left = newNode
    } else {
      parent.right = newNode
    }

    push({
      description:
        parent === null
          ? `${value} inserted as the root.`
          : `${value} inserted to the ${wentLeft ? 'left' : 'right'} of node ${parent.value}.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_NULL,
      isPredictionRequired: false,
      state: { root, currentNode: newNode, targetValue: value, path, insertedValue: value, operation: 'insert' },
      isFinalStep: isLastValue,
    })
  })

  if (values.length === 0) {
    push({
      description: 'No values were given to insert; the tree remains empty.',
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_NULL,
      isPredictionRequired: false,
      state: { root: null, currentNode: null, targetValue: 0, path: [], operation: 'insert' },
      isFinalStep: true,
    })
  }

  return snapshots
}

/**
 * Pure snapshot engine for BST search. Takes an existing root (e.g.
 * the final root produced by bstInsertEngine) and a target value,
 * producing a BST_DIRECTION snapshot for every node visited. Never
 * mutates the tree.
 */
export function bstSearchEngine(root: BSTNode | null, target: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  push({
    description: `Searching for ${target}, starting at the root.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: { root, currentNode: root, targetValue: target, path: [], operation: 'search' },
  })

  const path: string[] = []
  let node = root
  let found: BSTNode | null = null

  while (node !== null) {
    path.push(node.id)

    if (node.value === target) {
      found = node
      push({
        description: `Found ${target} in the tree.`,
        pseudocodeLine: PSEUDOCODE_LINE.DUPLICATE,
        isPredictionRequired: false,
        state: { root, currentNode: node, targetValue: target, path, foundNode: node, operation: 'search' },
      })
      break
    }

    push({
      description: `At node ${node.value}: is ${target} smaller or larger?`,
      pseudocodeLine: target < node.value ? PSEUDOCODE_LINE.COMPARE_LESS : PSEUDOCODE_LINE.COMPARE_GREATER,
      isPredictionRequired: true,
      state: { root, currentNode: node, targetValue: target, path, operation: 'search' },
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    node = target < node.value ? node.left : node.right
  }

  if (found === null && node === null) {
    push({
      description: `${target} was not found in the tree.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_NULL,
      isPredictionRequired: false,
      state: { root, currentNode: null, targetValue: target, path, foundNode: null, operation: 'search' },
    })
  }

  push({
    description: found
      ? `Search complete. ${target} was found in the tree.`
      : `Search complete. ${target} was not found in the tree.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: { root, currentNode: found, targetValue: target, path, foundNode: found, operation: 'search' },
    isFinalStep: true,
  })

  return snapshots
}

/**
 * Pure snapshot engine for BST deletion. Takes an existing root (e.g.
 * the final root produced by bstInsertEngine) and deletes `target`,
 * handling all three standard cases: leaf (removed outright), one
 * child (child takes its place), and two children (copy the in-order
 * successor's value up, then delete the successor - which itself has
 * at most a right child, so that removal is always the simple case).
 * Operates on a clone of `root`; never mutates the caller's tree.
 */
export function bstDeleteEngine(root: BSTNode | null, target: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let workingRoot = cloneNode(root)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  push({
    description: `Searching for ${target} to delete, starting at the root.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: { root: workingRoot, currentNode: workingRoot, targetValue: target, path: [], operation: 'delete' },
  })

  const path: string[] = []
  let node = workingRoot
  let parent: BSTNode | null = null
  let wentLeft = false

  while (node !== null && node.value !== target) {
    path.push(node.id)
    push({
      description: `At node ${node.value}: is ${target} smaller or larger?`,
      pseudocodeLine: target < node.value ? PSEUDOCODE_LINE.COMPARE_LESS : PSEUDOCODE_LINE.COMPARE_GREATER,
      isPredictionRequired: true,
      state: { root: workingRoot, currentNode: node, targetValue: target, path, operation: 'delete' },
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })
    parent = node
    if (target < node.value) {
      wentLeft = true
      node = node.left
    } else {
      wentLeft = false
      node = node.right
    }
  }

  if (node === null) {
    push({
      description: `${target} was not found in the tree. Nothing to delete.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_NULL,
      isPredictionRequired: false,
      state: { root: workingRoot, currentNode: null, targetValue: target, path, foundNode: null, operation: 'delete' },
      isFinalStep: true,
    })
    return snapshots
  }

  path.push(node.id)

  if (node.left !== null && node.right !== null) {
    let successorParent = node
    let successor = node.right
    while (successor.left !== null) {
      successorParent = successor
      successor = successor.left
    }

    push({
      description: `${node.value} has two children. Its in-order successor is ${successor.value} (leftmost node of the right subtree).`,
      pseudocodeLine: PSEUDOCODE_LINE.DELETE_SUCCESSOR,
      isPredictionRequired: true,
      state: { root: workingRoot, currentNode: node, targetValue: target, path, operation: 'delete' },
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    const successorValue = successor.value
    if (successorParent === node) {
      successorParent.right = successor.right
    } else {
      successorParent.left = successor.right
    }
    node.value = successorValue

    push({
      description: `${target} replaced by successor value ${successorValue}; the successor node is removed from its old position.`,
      pseudocodeLine: PSEUDOCODE_LINE.DELETE_SUCCESSOR,
      isPredictionRequired: false,
      state: { root: workingRoot, currentNode: node, targetValue: target, path, insertedValue: successorValue, operation: 'delete' },
      isFinalStep: true,
    })
  } else {
    const child = node.left ?? node.right
    push({
      description:
        child === null
          ? `${node.value} is a leaf node. It is simply removed.`
          : `${node.value} has one child (${child.value}). The child takes its place.`,
      pseudocodeLine: PSEUDOCODE_LINE.DELETE_SIMPLE,
      isPredictionRequired: true,
      state: { root: workingRoot, currentNode: node, targetValue: target, path, operation: 'delete' },
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    if (parent === null) {
      workingRoot = child
    } else if (wentLeft) {
      parent.left = child
    } else {
      parent.right = child
    }

    push({
      description: `${target} removed from the tree.`,
      pseudocodeLine: PSEUDOCODE_LINE.DELETE_SIMPLE,
      isPredictionRequired: false,
      state: { root: workingRoot, currentNode: null, targetValue: target, path, operation: 'delete' },
      isFinalStep: true,
    })
  }

  return snapshots
}
