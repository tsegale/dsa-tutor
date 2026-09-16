import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { BSTNode } from './bst'

/** AVLNode narrows BSTNode's left/right to AVLNode (rather than a bare
 * `extends BSTNode`, which can't re-type inherited fields) and adds the
 * balance-tracking fields every AVL operation reads and updates. */
export interface AVLNode extends Omit<BSTNode, 'left' | 'right'> {
  left: AVLNode | null
  right: AVLNode | null
  height: number
  balanceFactor: number
}

export interface AVLState {
  root: AVLNode | null
  /** Kept so this state shape stays a superset of BSTState - TreeCanvas
   * reads currentNode/foundNode/path/targetValue defensively regardless
   * of which tree engine produced the snapshot. */
  currentNode: AVLNode | null
  foundNode: AVLNode | null
  targetValue: number
  path: string[]
  operation: 'insert' | 'delete'
  /** The node currently being balance-checked; null outside that step.
   * Read directly by PredictionZone's AVL_BALANCE_CHECK tile case and by
   * the AI service's evaluation, so it stays a flat top-level field. */
  balanceFactor: number | null
  rotationType: 'LL' | 'RR' | 'LR' | 'RL' | null
  unbalancedNodeId: string | null
}

// Indices match PseudocodePanel's 'avl-insert' / 'avl-delete' arrays:
//   0: 'avl_insert(root, value):'
//   1: '  perform standard BST insert'
//   2: '  update height of every ancestor'
//   3: '  for each ancestor bottom-up:'
//   4: '    balance_factor = height(left) - height(right)'
//   5: '    if balance_factor > 1: // left heavy'
//   6: '      if value < left.value: LL rotation'
//   7: '      else: LR rotation (left-right)'
//   8: '    if balance_factor < -1: // right heavy'
//   9: '      if value > right.value: RR rotation'
//   10: '      else: RL rotation (right-left)'
const PSEUDOCODE_LINE = {
  START: 0,
  BST_INSERT: 1,
  UPDATE_HEIGHT: 2,
  WALK_ANCESTORS: 3,
  BALANCE_FACTOR: 4,
  LEFT_HEAVY: 5,
  LL_CASE: 6,
  LR_CASE: 7,
  RIGHT_HEAVY: 8,
  RR_CASE: 9,
  RL_CASE: 10,
} as const

function cloneAVLNode(node: AVLNode | null): AVLNode | null {
  if (!node) return null
  return {
    value: node.value,
    id: node.id,
    height: node.height,
    balanceFactor: node.balanceFactor,
    left: cloneAVLNode(node.left),
    right: cloneAVLNode(node.right),
  }
}

function nodeHeight(node: AVLNode | null): number {
  return node ? node.height : 0
}

function updateHeight(node: AVLNode): void {
  node.height = 1 + Math.max(nodeHeight(node.left), nodeHeight(node.right))
  node.balanceFactor = nodeHeight(node.left) - nodeHeight(node.right)
}

function rotateRight(node: AVLNode): AVLNode {
  const newRoot = node.left!
  node.left = newRoot.right
  newRoot.right = node
  updateHeight(node)
  updateHeight(newRoot)
  return newRoot
}

function rotateLeft(node: AVLNode): AVLNode {
  const newRoot = node.right!
  node.right = newRoot.left
  newRoot.left = node
  updateHeight(node)
  updateHeight(newRoot)
  return newRoot
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: AVLState
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
      root: cloneAVLNode(params.state.root),
      currentNode: cloneAVLNode(params.state.currentNode),
      foundNode: params.state.foundNode !== undefined ? cloneAVLNode(params.state.foundNode) : undefined,
      path: [...params.state.path],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.AVL,
  }
}

/**
 * Pure snapshot engine for AVL insertion. Inserts each value in `values`
 * one at a time into a tree that carries over between insertions (unlike
 * bstInsertEngine, which restarts from empty every call - an AVL demo
 * needs an accumulating tree so later inserts can actually trigger
 * rotations). Every insert: descends via standard BST comparisons
 * (BST_DIRECTION, exactly like bst.ts), creates the new leaf, then walks
 * back up recalculating height/balance factor at each ancestor
 * (AVL_BALANCE_CHECK) until it finds the first unbalanced node, applies
 * the one rotation that always suffices to rebalance an AVL insert
 * (AVL_ROTATION_TYPE), and stops - later ancestors above the rotated
 * subtree never need checking, since a single rotation always restores
 * the full tree's height to its pre-insert value.
 */
export function avlInsertEngine(values: number[]): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let idCounter = 0
  let root: AVLNode | null = null

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<AVLState>): AVLState {
    return {
      root,
      currentNode: null,
      foundNode: null,
      targetValue: 0,
      path: [],
      operation: 'insert',
      balanceFactor: null,
      rotationType: null,
      unbalancedNodeId: null,
      ...overrides,
    }
  }

  function insertAndBalance(node: AVLNode | null, value: number, path: string[]): AVLNode {
    if (node === null) {
      return { value, left: null, right: null, id: `avl-${value}-${idCounter++}`, height: 1, balanceFactor: 0 }
    }

    push({
      description: `At node ${node.value}: is ${value} smaller or larger?`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: true,
      state: baseState({ currentNode: node, targetValue: value, path: [...path, node.id] }),
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    if (value < node.value) {
      node.left = insertAndBalance(node.left, value, [...path, node.id])
    } else {
      node.right = insertAndBalance(node.right, value, [...path, node.id])
    }

    updateHeight(node)

    push({
      description: `Back at node ${node.value}: height is now ${node.height}, balance factor is ${node.balanceFactor}.`,
      pseudocodeLine: PSEUDOCODE_LINE.BALANCE_FACTOR,
      isPredictionRequired: true,
      state: baseState({ currentNode: node, targetValue: value, path: [...path, node.id], balanceFactor: node.balanceFactor }),
      criticalJunctionType: CriticalJunctionType.AVL_BALANCE_CHECK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    if (node.balanceFactor > 1) {
      const rotationType = value < node.left!.value ? 'LL' : 'LR'
      push({
        description: `Node ${node.value} is left-heavy (balance factor ${node.balanceFactor}). Which rotation restores balance?`,
        pseudocodeLine: rotationType === 'LL' ? PSEUDOCODE_LINE.LL_CASE : PSEUDOCODE_LINE.LR_CASE,
        isPredictionRequired: true,
        state: baseState({
          currentNode: node,
          targetValue: value,
          path: [...path, node.id],
          balanceFactor: node.balanceFactor,
          rotationType,
          unbalancedNodeId: node.id,
        }),
        criticalJunctionType: CriticalJunctionType.AVL_ROTATION_TYPE,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })

      const rotated = rotationType === 'LL' ? rotateRight(node) : (((node.left = rotateLeft(node.left!)), rotateRight(node)))
      // node had no parent to reconnect through (it's the tree's actual
      // root), so the outer `root` binding needs updating directly -
      // otherwise this push's baseState() would render the pre-rotation
      // tree even though the description says a rotation just happened.
      if (node === root) root = rotated

      push({
        description: `Applied a ${rotationType} rotation. ${rotated.value} is now the root of this subtree.`,
        pseudocodeLine: rotationType === 'LL' ? PSEUDOCODE_LINE.LL_CASE : PSEUDOCODE_LINE.LR_CASE,
        isPredictionRequired: false,
        state: baseState({ currentNode: rotated, targetValue: value, path: [...path, rotated.id], rotationType }),
      })

      return rotated
    }

    if (node.balanceFactor < -1) {
      const rotationType = value > node.right!.value ? 'RR' : 'RL'
      push({
        description: `Node ${node.value} is right-heavy (balance factor ${node.balanceFactor}). Which rotation restores balance?`,
        pseudocodeLine: rotationType === 'RR' ? PSEUDOCODE_LINE.RR_CASE : PSEUDOCODE_LINE.RL_CASE,
        isPredictionRequired: true,
        state: baseState({
          currentNode: node,
          targetValue: value,
          path: [...path, node.id],
          balanceFactor: node.balanceFactor,
          rotationType,
          unbalancedNodeId: node.id,
        }),
        criticalJunctionType: CriticalJunctionType.AVL_ROTATION_TYPE,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })

      const rotated = rotationType === 'RR' ? rotateLeft(node) : (((node.right = rotateRight(node.right!)), rotateLeft(node)))
      if (node === root) root = rotated

      push({
        description: `Applied a ${rotationType} rotation. ${rotated.value} is now the root of this subtree.`,
        pseudocodeLine: rotationType === 'RR' ? PSEUDOCODE_LINE.RR_CASE : PSEUDOCODE_LINE.RL_CASE,
        isPredictionRequired: false,
        state: baseState({ currentNode: rotated, targetValue: value, path: [...path, rotated.id], rotationType }),
      })

      return rotated
    }

    return node
  }

  values.forEach((value, valueIndex) => {
    const isLastValue = valueIndex === values.length - 1
    root = insertAndBalance(root, value, [])

    push({
      description: `${value} inserted. The tree remains height-balanced.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({ targetValue: value }),
      isFinalStep: isLastValue,
    })
  })

  if (values.length === 0) {
    push({
      description: 'No values were given to insert; the tree remains empty.',
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })
  }

  return snapshots
}

/**
 * Pure snapshot engine for AVL deletion. Takes an existing root (e.g.
 * the final root produced by avlInsertEngine) and deletes `target`. Like
 * insert, standard BST delete first (leaf / one child / two children,
 * exactly like bstDeleteEngine's three cases), then walks back up from
 * the deletion point recalculating balance - but unlike insert, a delete
 * can require a rotation at *every* ancestor on the way back to the
 * root, not just the first unbalanced one, so the walk never stops
 * early. Never mutates the caller's tree.
 */
export function avlDeleteEngine(root: AVLNode | null, target: number): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  // Mutable (not const): if the tree's actual root ends up needing a
  // rotation, this binding is updated in place so every baseState() call
  // after that point (including the one for the rotation snapshot
  // itself) reflects the new root - see the `node === workingRoot` checks
  // in rebalance() below.
  let workingRoot = cloneAVLNode(root)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<AVLState>): AVLState {
    return {
      root: workingRoot,
      currentNode: null,
      foundNode: null,
      targetValue: target,
      path: [],
      operation: 'delete',
      balanceFactor: null,
      rotationType: null,
      unbalancedNodeId: null,
      ...overrides,
    }
  }

  function rebalance(node: AVLNode, path: string[]): AVLNode {
    updateHeight(node)

    push({
      description: `Back at node ${node.value}: height is now ${node.height}, balance factor is ${node.balanceFactor}.`,
      pseudocodeLine: PSEUDOCODE_LINE.BALANCE_FACTOR,
      isPredictionRequired: true,
      state: baseState({ currentNode: node, path: [...path, node.id], balanceFactor: node.balanceFactor }),
      criticalJunctionType: CriticalJunctionType.AVL_BALANCE_CHECK,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    if (node.balanceFactor > 1) {
      // After a delete (unlike insert) there's no "value just inserted" to
      // compare against, so LL vs LR is decided by the child's own
      // balance factor sign instead - the standard AVL-delete rule.
      const rotationType = node.left!.balanceFactor >= 0 ? 'LL' : 'LR'
      push({
        description: `Node ${node.value} is left-heavy (balance factor ${node.balanceFactor}). Which rotation restores balance?`,
        pseudocodeLine: rotationType === 'LL' ? PSEUDOCODE_LINE.LL_CASE : PSEUDOCODE_LINE.LR_CASE,
        isPredictionRequired: true,
        state: baseState({
          currentNode: node,
          path: [...path, node.id],
          balanceFactor: node.balanceFactor,
          rotationType,
          unbalancedNodeId: node.id,
        }),
        criticalJunctionType: CriticalJunctionType.AVL_ROTATION_TYPE,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      const rotated = rotationType === 'LL' ? rotateRight(node) : (((node.left = rotateLeft(node.left!)), rotateRight(node)))
      if (node === workingRoot) workingRoot = rotated
      push({
        description: `Applied a ${rotationType} rotation. ${rotated.value} is now the root of this subtree.`,
        pseudocodeLine: rotationType === 'LL' ? PSEUDOCODE_LINE.LL_CASE : PSEUDOCODE_LINE.LR_CASE,
        isPredictionRequired: false,
        state: baseState({ currentNode: rotated, path: [...path, rotated.id], rotationType }),
      })
      return rotated
    }

    if (node.balanceFactor < -1) {
      const rotationType = node.right!.balanceFactor <= 0 ? 'RR' : 'RL'
      push({
        description: `Node ${node.value} is right-heavy (balance factor ${node.balanceFactor}). Which rotation restores balance?`,
        pseudocodeLine: rotationType === 'RR' ? PSEUDOCODE_LINE.RR_CASE : PSEUDOCODE_LINE.RL_CASE,
        isPredictionRequired: true,
        state: baseState({
          currentNode: node,
          path: [...path, node.id],
          balanceFactor: node.balanceFactor,
          rotationType,
          unbalancedNodeId: node.id,
        }),
        criticalJunctionType: CriticalJunctionType.AVL_ROTATION_TYPE,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      const rotated = rotationType === 'RR' ? rotateLeft(node) : (((node.right = rotateRight(node.right!)), rotateLeft(node)))
      if (node === workingRoot) workingRoot = rotated
      push({
        description: `Applied a ${rotationType} rotation. ${rotated.value} is now the root of this subtree.`,
        pseudocodeLine: rotationType === 'RR' ? PSEUDOCODE_LINE.RR_CASE : PSEUDOCODE_LINE.RL_CASE,
        isPredictionRequired: false,
        state: baseState({ currentNode: rotated, path: [...path, rotated.id], rotationType }),
      })
      return rotated
    }

    return node
  }

  // Takes the value to search for as an explicit parameter (deleteValue)
  // rather than closing over the outer `target` - the two-children case
  // below needs to recurse for the in-order successor's value, not the
  // original target, once it has copied that successor's value up. Using
  // `target` there was the original bug: it searched the right subtree
  // for a value that was never in it, so the successor was copied up but
  // never actually spliced out, leaving a duplicate.
  function deleteAndBalance(node: AVLNode | null, deleteValue: number, path: string[]): AVLNode | null {
    if (node === null) return null

    if (deleteValue < node.value) {
      push({
        description: `At node ${node.value}: is ${deleteValue} smaller or larger?`,
        pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
        isPredictionRequired: true,
        state: baseState({ currentNode: node, path: [...path, node.id] }),
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
      node.left = deleteAndBalance(node.left, deleteValue, [...path, node.id])
    } else if (deleteValue > node.value) {
      push({
        description: `At node ${node.value}: is ${deleteValue} smaller or larger?`,
        pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
        isPredictionRequired: true,
        state: baseState({ currentNode: node, path: [...path, node.id] }),
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
      node.right = deleteAndBalance(node.right, deleteValue, [...path, node.id])
    } else if (node.left === null || node.right === null) {
      const child = node.left ?? node.right
      push({
        description:
          child === null
            ? `${node.value} is a leaf node. It is simply removed.`
            : `${node.value} has one child (${child.value}). The child takes its place.`,
        pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
        isPredictionRequired: true,
        state: baseState({ currentNode: node, path: [...path, node.id] }),
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      return child
    } else {
      let successor = node.right
      while (successor.left !== null) successor = successor.left
      push({
        description: `${node.value} has two children. Its in-order successor is ${successor.value} (leftmost node of the right subtree).`,
        pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
        isPredictionRequired: true,
        state: baseState({ currentNode: node, path: [...path, node.id] }),
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      const successorValue = successor.value
      node.value = successorValue
      node.right = deleteAndBalance(node.right, successorValue, [...path, node.id])
    }

    return rebalance(node, path)
  }

  push({
    description: `Searching for ${target} to delete, starting at the root.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ currentNode: workingRoot }),
  })

  if (workingRoot === null) {
    push({
      description: 'The tree is empty. Nothing to delete.',
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })
    return snapshots
  }

  const newRoot = deleteAndBalance(workingRoot, target, [])

  push({
    description: `${target} deleted. The tree remains height-balanced.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: { ...baseState({}), root: newRoot },
    isFinalStep: true,
  })

  return snapshots
}
