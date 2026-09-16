import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { BSTNode } from './bst'

export type TraversalType = 'inorder' | 'preorder' | 'postorder' | 'levelorder'

export interface TraversalState {
  root: BSTNode | null
  currentNode: BSTNode | null
  /** Kept so this state shape stays a superset of BSTState - TreeCanvas
   * reads it defensively even though traversal never "finds" a target. */
  foundNode: BSTNode | null
  targetValue: number
  /** ids of nodes visited so far, in visit order. */
  path: string[]
  operation: 'traverse'
  traversalType: TraversalType
  /** values visited so far, in visit order (mirrors `path` but by value,
   * which is what the prediction description text actually reads). */
  visitedOrder: number[]
  /** human-readable active call frames, root-to-currentNode ancestors. */
  callStack: string[]
  /** the value the traversal will visit next; null once complete. Read
   * by PredictionZone's VISIT_NODE tile case as the correct answer. */
  nextVisitValue: number | null
}

const TRAVERSAL_COPY: Record<TraversalType, { label: string; predict: (visited: number[]) => string }> = {
  inorder: {
    label: 'inorder (left, root, right)',
    predict: (visited) =>
      `Inorder visits left subtree first. We've visited [${visited.join(', ')}] so far. Which node is visited next?`,
  },
  preorder: {
    label: 'preorder (root, left, right)',
    predict: (visited) =>
      `Preorder visits the current node before its children. We've visited [${visited.join(', ')}] so far. Which node is visited next?`,
  },
  postorder: {
    label: 'postorder (left, right, root)',
    predict: (visited) =>
      `Postorder visits children before their parent. We've visited [${visited.join(', ')}] so far. Which node is visited next?`,
  },
  levelorder: {
    label: 'level order (breadth-first, level by level)',
    predict: (visited) =>
      `Level order visits nodes breadth-first, level by level, left to right. We've visited [${visited.join(', ')}] so far. Which node starts the next level?`,
  },
}

interface PseudocodeLines {
  START: number
  NULL_CHECK: number
  VISIT: number
  DONE: number
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: TraversalState
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
      path: [...params.state.path],
      visitedOrder: [...params.state.visitedOrder],
      callStack: [...params.state.callStack],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.TREE,
  }
}

/** Root-to-node ancestor chain (exclusive of `target`), as the recursive
 * frames that would still be on the call stack while visiting it. */
function ancestorsOf(root: BSTNode | null, target: BSTNode | null): BSTNode[] {
  if (!root || !target) return []
  const ancestors: BSTNode[] = []
  let node: BSTNode | null = root
  while (node !== null && node.id !== target.id) {
    ancestors.push(node)
    node = target.value < node.value ? node.left : node.right
  }
  return ancestors
}

function inorderNodes(root: BSTNode | null): BSTNode[] {
  const result: BSTNode[] = []
  const stack: BSTNode[] = []
  let current = root
  while (stack.length > 0 || current !== null) {
    while (current !== null) {
      stack.push(current)
      current = current.left
    }
    const node = stack.pop()!
    result.push(node)
    current = node.right
  }
  return result
}

function preorderNodes(root: BSTNode | null): BSTNode[] {
  if (!root) return []
  const result: BSTNode[] = []
  const stack: BSTNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    result.push(node)
    if (node.right) stack.push(node.right)
    if (node.left) stack.push(node.left)
  }
  return result
}

/** Two-stack trick: pushing onto stack2 in stack1's pop order (root,
 * right, left) means popping stack2 yields left, right, root - postorder -
 * without the awkwardness of tracking "last visited" on a single stack. */
function postorderNodes(root: BSTNode | null): BSTNode[] {
  if (!root) return []
  const stack1: BSTNode[] = [root]
  const stack2: BSTNode[] = []
  while (stack1.length > 0) {
    const node = stack1.pop()!
    stack2.push(node)
    if (node.left) stack1.push(node.left)
    if (node.right) stack1.push(node.right)
  }
  return stack2.reverse()
}

/** BFS via an explicit queue: nodes grouped by depth, left to right
 * within each level. */
function levelOrderNodes(root: BSTNode | null): BSTNode[] {
  if (!root) return []
  const result: BSTNode[] = []
  const queue: BSTNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    if (node.left) queue.push(node.left)
    if (node.right) queue.push(node.right)
  }
  return result
}

/** Index (within `levelOrderNodes`' output) of the first node at each
 * depth - the moments level order should prompt, rather than every
 * other node like the other three traversals. */
function levelStartIndices(root: BSTNode | null, orderedNodes: BSTNode[]): Set<number> {
  const depthById = new Map<string, number>()
  if (root) depthById.set(root.id, 0)
  for (const node of orderedNodes) {
    const depth = depthById.get(node.id) ?? 0
    if (node.left) depthById.set(node.left.id, depth + 1)
    if (node.right) depthById.set(node.right.id, depth + 1)
  }
  const starts = new Set<number>()
  let lastDepth = -1
  orderedNodes.forEach((node, i) => {
    const depth = depthById.get(node.id) ?? 0
    if (depth !== lastDepth) {
      starts.add(i)
      lastDepth = depth
    }
  })
  return starts
}

/**
 * Builds the shared snapshot sequence for a traversal, given the tree
 * root and the already-computed visit order for that traversal type.
 * Prediction snapshots (VISIT_NODE) fire whenever `shouldPredict(index)`
 * is true - by default every other visit, so the learner is tested
 * without being asked at literally every node.
 */
function buildTraversalSnapshots(
  root: BSTNode | null,
  traversalType: TraversalType,
  orderedNodes: BSTNode[],
  lines: PseudocodeLines,
  shouldPredict: (index: number) => boolean = (i) => i % 2 === 0,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const copy = TRAVERSAL_COPY[traversalType]

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<TraversalState>): TraversalState {
    return {
      root,
      currentNode: null,
      foundNode: null,
      targetValue: 0,
      path: [],
      operation: 'traverse',
      traversalType,
      visitedOrder: [],
      callStack: [],
      nextVisitValue: orderedNodes[0]?.value ?? null,
      ...overrides,
    }
  }

  push({
    description: `Starting a ${copy.label} traversal of the tree.`,
    pseudocodeLine: lines.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  if (orderedNodes.length === 0) {
    push({
      description: 'The tree is empty; there is nothing to traverse.',
      pseudocodeLine: lines.NULL_CHECK,
      isPredictionRequired: false,
      state: baseState({ nextVisitValue: null }),
      isFinalStep: true,
    })
    return snapshots
  }

  const visitedOrder: number[] = []
  const visitedIds: string[] = []

  orderedNodes.forEach((node, i) => {
    const callStack = ancestorsOf(root, node).map((n) => `${traversalType}(${n.value})`)

    if (shouldPredict(i)) {
      push({
        description: copy.predict(visitedOrder),
        pseudocodeLine: lines.VISIT,
        isPredictionRequired: true,
        state: baseState({
          currentNode: node,
          path: [...visitedIds],
          visitedOrder: [...visitedOrder],
          callStack,
          nextVisitValue: node.value,
        }),
        criticalJunctionType: CriticalJunctionType.VISIT_NODE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
    }

    visitedOrder.push(node.value)
    visitedIds.push(node.id)

    push({
      description: `Visited ${node.value}. Order so far: [${visitedOrder.join(', ')}].`,
      pseudocodeLine: lines.VISIT,
      isPredictionRequired: false,
      state: baseState({
        currentNode: node,
        path: [...visitedIds],
        visitedOrder: [...visitedOrder],
        callStack,
        nextVisitValue: orderedNodes[i + 1]?.value ?? null,
      }),
    })
  })

  push({
    description: `${traversalType[0].toUpperCase()}${traversalType.slice(1)} traversal complete. Full order: [${visitedOrder.join(', ')}].`,
    pseudocodeLine: lines.DONE,
    isPredictionRequired: false,
    state: baseState({
      currentNode: null,
      path: [...visitedIds],
      visitedOrder: [...visitedOrder],
      nextVisitValue: null,
    }),
    isFinalStep: true,
  })

  return snapshots
}

// Indices match PseudocodePanel's 'tree-inorder' array exactly:
//   0: 'inorder(node):'
//   1: '  if node is null: return'
//   2: '  inorder(node.left)'
//   3: '  visit(node)'
//   4: '  inorder(node.right)'
//   5: 'Result: nodes in ascending sorted order'
export function inorderEngine(root: BSTNode | null): AlgorithmSnapshot[] {
  return buildTraversalSnapshots(root, 'inorder', inorderNodes(root), { START: 0, NULL_CHECK: 1, VISIT: 3, DONE: 5 })
}

// Indices match PseudocodePanel's 'tree-preorder' array exactly:
//   0: 'preorder(node):'
//   1: '  if node is null: return'
//   2: '  visit(node)'
//   3: '  preorder(node.left)'
//   4: '  preorder(node.right)'
//   5: 'Result: root before children ...'
export function preorderEngine(root: BSTNode | null): AlgorithmSnapshot[] {
  return buildTraversalSnapshots(root, 'preorder', preorderNodes(root), { START: 0, NULL_CHECK: 1, VISIT: 2, DONE: 5 })
}

// Indices match PseudocodePanel's 'tree-postorder' array exactly:
//   0: 'postorder(node):'
//   1: '  if node is null: return'
//   2: '  postorder(node.left)'
//   3: '  postorder(node.right)'
//   4: '  visit(node)'
//   5: 'Result: children before their parent ...'
export function postorderEngine(root: BSTNode | null): AlgorithmSnapshot[] {
  return buildTraversalSnapshots(root, 'postorder', postorderNodes(root), { START: 0, NULL_CHECK: 1, VISIT: 4, DONE: 5 })
}

// Indices match PseudocodePanel's 'tree-level-order' array exactly:
//   0: 'levelorder(root):'
//   1: '  if root is null: return'
//   2: '  queue = [root]'
//   3: '  while queue is not empty:'
//   4: '    node = dequeue()'
//   5: '    visit(node)'
//   6: '    enqueue node.left, node.right if they exist'
//   7: 'Result: nodes grouped by depth, left to right within each level'
export function levelorderEngine(root: BSTNode | null): AlgorithmSnapshot[] {
  const ordered = levelOrderNodes(root)
  const starts = levelStartIndices(root, ordered)
  return buildTraversalSnapshots(
    root,
    'levelorder',
    ordered,
    { START: 0, NULL_CHECK: 1, VISIT: 5, DONE: 7 },
    (i) => starts.has(i),
  )
}
