import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export type RBColor = 'RED' | 'BLACK'

/** The exported/public node shape carried in AlgorithmSnapshot's
 * dataStructureState - `parent` is a plain node id (string), not a live
 * object reference, so cloning it for snapshot immutability is a normal
 * recursive copy with no circular-reference handling required. */
export interface RBNode {
  value: number
  id: string
  color: RBColor
  left: RBNode | null
  right: RBNode | null
  parent: string | null
}

export interface RBState {
  root: RBNode | null
  currentNode: RBNode | null
  /** Kept so this state shape stays a superset of BSTState - TreeCanvas
   * reads currentNode/foundNode/path/targetValue defensively regardless
   * of which tree engine produced the snapshot. */
  foundNode: RBNode | null
  targetValue: number
  path: string[]
  operation: 'insert' | 'delete'
  uncleNodeId: string | null
  /** Read directly by PredictionZone's RB_COLOR_DECISION tile case. */
  uncleColor: RBColor | null
  /** Read directly by PredictionZone's RB_ROTATION_RECOLOR tile case and
   * by the AI service's evaluation, so it stays a flat top-level field. */
  fixupOperation: 'recolor' | 'left-rotate' | 'right-rotate' | null
}

/** The live working tree used internally by the algorithm: real object
 * parent references (not ids), so rotations and fixups can navigate
 * parent/grandparent/sibling/uncle in O(1) exactly like the textbook
 * (CLRS) algorithm does. Never leaves this file - every snapshot is
 * built from `toPublicNode`, which breaks the circular reference. */
interface WorkingNode {
  value: number
  id: string
  color: RBColor
  left: WorkingNode | null
  right: WorkingNode | null
  parent: WorkingNode | null
}

function isRed(node: WorkingNode | null): boolean {
  return node !== null && node.color === 'RED'
}

function toPublicNode(node: WorkingNode | null): RBNode | null {
  if (!node) return null
  return {
    value: node.value,
    id: node.id,
    color: node.color,
    parent: node.parent?.id ?? null,
    left: toPublicNode(node.left),
    right: toPublicNode(node.right),
  }
}

// Indices match PseudocodePanel's 'rb-insert' / 'rb-delete' arrays:
//   0: 'rb_insert(root, value):'
//   1: '  standard BST insert, colour the new node RED'
//   2: '  while parent is RED:'
//   3: '    if uncle is RED: recolour parent+uncle BLACK, grandparent RED (Case 1)'
//   4: '    else if node is an "inner" grandchild: rotate parent (Case 2, reduces to Case 3)'
//   5: '    else: recolour parent/grandparent, rotate grandparent (Case 3)'
//   6: '  root.colour = BLACK'
const PSEUDOCODE_LINE = {
  START: 0,
  BST_INSERT: 1,
  FIXUP_LOOP: 2,
  CASE_1: 3,
  CASE_2: 4,
  CASE_3: 5,
  ROOT_BLACK: 6,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: RBState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

interface EngineContext {
  root: WorkingNode | null
  snapshots: AlgorithmSnapshot[]
  stepIndex: number
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, path: [...params.state.path] },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.RED_BLACK,
  }
}

function push(ctx: EngineContext, params: Omit<SnapshotParams, 'stepIndex' | 'state'> & { state: Omit<RBState, 'root'> }) {
  ctx.snapshots.push(
    makeSnapshot({
      ...params,
      stepIndex: ctx.stepIndex++,
      state: { ...params.state, root: toPublicNode(ctx.root) },
    }),
  )
}

function baseState(overrides: Partial<Omit<RBState, 'root'>>): Omit<RBState, 'root'> {
  return {
    currentNode: null,
    foundNode: null,
    targetValue: 0,
    path: [],
    operation: 'insert',
    uncleNodeId: null,
    uncleColor: null,
    fixupOperation: null,
    ...overrides,
  }
}

function pathIds(node: WorkingNode | null): string[] {
  const ids: string[] = []
  let n = node
  while (n) {
    ids.unshift(n.id)
    n = n.parent
  }
  return ids
}

function leftRotate(ctx: EngineContext, x: WorkingNode) {
  const y = x.right!
  x.right = y.left
  if (y.left) y.left.parent = x
  y.parent = x.parent
  if (x.parent === null) ctx.root = y
  else if (x === x.parent.left) x.parent.left = y
  else x.parent.right = y
  y.left = x
  x.parent = y
}

function rightRotate(ctx: EngineContext, x: WorkingNode) {
  const y = x.left!
  x.left = y.right
  if (y.right) y.right.parent = x
  y.parent = x.parent
  if (x.parent === null) ctx.root = y
  else if (x === x.parent.right) x.parent.right = y
  else x.parent.left = y
  y.right = x
  x.parent = y
}

/**
 * Pure snapshot engine for Red-Black insertion. Inserts each value in
 * `values` one at a time into a tree that carries over between
 * insertions (like avlInsertEngine - a Red-Black demo needs an
 * accumulating tree so later inserts can actually trigger fix-ups).
 * Standard CLRS RB-INSERT-FIXUP: descend via BST comparisons
 * (BST_DIRECTION), colour the new node RED, then walk up while the
 * parent is RED, resolving each violation via one of three cases
 * (uncle red -> recolour and continue two levels up; uncle black and
 * node is an "inner" grandchild -> rotate to make it "outer" first;
 * uncle black and node is "outer" -> recolour + rotate the grandparent,
 * which always terminates the loop).
 */
export function rbInsertEngine(values: number[]): AlgorithmSnapshot[] {
  const ctx: EngineContext = { root: null, snapshots: [], stepIndex: 0 }
  let idCounter = 0

  function insertOne(value: number) {
    let parent: WorkingNode | null = null
    let node = ctx.root
    while (node !== null) {
      push(ctx, {
        description: `At node ${node.value}: is ${value} smaller or larger?`,
        pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
        isPredictionRequired: true,
        state: baseState({ currentNode: toPublicNode(node), targetValue: value, path: pathIds(node) }),
        criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
      parent = node
      node = value < node.value ? node.left : node.right
    }

    const newNode: WorkingNode = { value, id: `rb-${value}-${idCounter++}`, color: 'RED', left: null, right: null, parent }
    if (parent === null) ctx.root = newNode
    else if (value < parent.value) parent.left = newNode
    else parent.right = newNode

    push(ctx, {
      description: `${value} inserted as a new RED node.`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: false,
      state: baseState({ currentNode: toPublicNode(newNode), targetValue: value, path: pathIds(newNode) }),
    })

    fixupInsert(ctx, newNode, value)

    if (ctx.root) ctx.root.color = 'BLACK'
    push(ctx, {
      description: `${value} inserted. The root is always coloured BLACK.`,
      pseudocodeLine: PSEUDOCODE_LINE.ROOT_BLACK,
      isPredictionRequired: false,
      state: baseState({ targetValue: value }),
    })
  }

  values.forEach((value) => insertOne(value))

  if (ctx.snapshots.length > 0) ctx.snapshots[ctx.snapshots.length - 1].isFinalStep = true
  else
    push(ctx, {
      description: 'No values were given to insert; the tree remains empty.',
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })

  return ctx.snapshots
}

function fixupInsert(ctx: EngineContext, start: WorkingNode, insertedValue: number) {
  let z = start

  while (z.parent !== null && isRed(z.parent)) {
    const parent = z.parent
    const grandparent = parent.parent
    if (grandparent === null) break // root's own parent is never red in a valid tree; defensive only

    const parentIsLeft = parent === grandparent.left
    const uncle = parentIsLeft ? grandparent.right : grandparent.left

    push(ctx, {
      description: `Node ${z.value}'s parent ${parent.value} is RED - a violation. Its uncle is ${uncle ? `${uncle.value} (${uncle.color})` : 'a NIL leaf (BLACK)'}.`,
      pseudocodeLine: PSEUDOCODE_LINE.FIXUP_LOOP,
      isPredictionRequired: true,
      state: baseState({
        currentNode: toPublicNode(z),
        targetValue: insertedValue,
        path: pathIds(z),
        uncleNodeId: uncle?.id ?? null,
        uncleColor: uncle?.color ?? 'BLACK',
      }),
      criticalJunctionType: CriticalJunctionType.RB_COLOR_DECISION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    if (isRed(uncle)) {
      // Case 1: uncle red -> recolour, push the violation up to the grandparent.
      parent.color = 'BLACK'
      uncle!.color = 'BLACK'
      grandparent.color = 'RED'
      push(ctx, {
        description: `Case 1: uncle is RED. Recoloured ${parent.value} and ${uncle!.value} BLACK, ${grandparent.value} RED.`,
        pseudocodeLine: PSEUDOCODE_LINE.CASE_1,
        isPredictionRequired: true,
        state: baseState({
          currentNode: toPublicNode(grandparent),
          targetValue: insertedValue,
          path: pathIds(grandparent),
          uncleColor: 'RED',
          fixupOperation: 'recolor',
        }),
        criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      z = grandparent
      continue
    }

    // Uncle is black (or a NIL leaf). Case 2 (inner grandchild) reduces to
    // Case 3 by rotating the parent first; Case 3 (outer grandchild)
    // recolours and rotates the grandparent, which always terminates.
    if (parentIsLeft && z === parent.right) {
      push(ctx, {
        description: `Case 2: uncle is BLACK and ${z.value} is an "inner" grandchild. Left-rotate ${parent.value} to make it "outer".`,
        pseudocodeLine: PSEUDOCODE_LINE.CASE_2,
        isPredictionRequired: true,
        state: baseState({
          currentNode: toPublicNode(z),
          targetValue: insertedValue,
          path: pathIds(z),
          uncleColor: uncle?.color ?? 'BLACK',
          fixupOperation: 'left-rotate',
        }),
        criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      z = parent
      leftRotate(ctx, z)
    } else if (!parentIsLeft && z === parent.left) {
      push(ctx, {
        description: `Case 2 (mirror): uncle is BLACK and ${z.value} is an "inner" grandchild. Right-rotate ${parent.value} to make it "outer".`,
        pseudocodeLine: PSEUDOCODE_LINE.CASE_2,
        isPredictionRequired: true,
        state: baseState({
          currentNode: toPublicNode(z),
          targetValue: insertedValue,
          path: pathIds(z),
          uncleColor: uncle?.color ?? 'BLACK',
          fixupOperation: 'right-rotate',
        }),
        criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })
      z = parent
      rightRotate(ctx, z)
    }

    // z's parent (post possible Case 2 rotation) and grandparent now form
    // an "outer" shape - Case 3.
    const p = z.parent!
    const gp = p.parent!
    p.color = 'BLACK'
    gp.color = 'RED'
    const rotation = p === gp.left ? 'right-rotate' : 'left-rotate'
    push(ctx, {
      description: `Case 3: recoloured ${p.value} BLACK and ${gp.value} RED, then ${rotation === 'right-rotate' ? 'right' : 'left'}-rotated ${gp.value}.`,
      pseudocodeLine: PSEUDOCODE_LINE.CASE_3,
      isPredictionRequired: true,
      state: baseState({
        currentNode: toPublicNode(gp),
        targetValue: insertedValue,
        path: pathIds(gp),
        uncleColor: uncle?.color ?? 'BLACK',
        fixupOperation: rotation,
      }),
      criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })
    if (rotation === 'right-rotate') rightRotate(ctx, gp)
    else leftRotate(ctx, gp)
    break
  }
}

/**
 * Pure snapshot engine for Red-Black deletion. Takes an existing root
 * (e.g. the final root produced by rbInsertEngine) and deletes `target`.
 * Standard CLRS RB-DELETE: splice out the target (or, for a two-children
 * node, splice out its in-order successor after copying the successor's
 * value up), tracking the spliced-out node's original colour and the
 * node that took its place (`x`, possibly null - "doubly black" if the
 * removed node was BLACK). If a BLACK node was removed, RB-DELETE-FIXUP
 * walks from `x` back to the root resolving the doubly-black violation
 * via the four standard sibling-based cases. Never mutates the caller's
 * tree.
 */
export function rbDeleteEngine(root: RBNode | null, target: number): AlgorithmSnapshot[] {
  const ctx: EngineContext = { root: cloneToWorking(root, null), snapshots: [], stepIndex: 0 }

  push(ctx, {
    description: `Searching for ${target} to delete, starting at the root.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ currentNode: toPublicNode(ctx.root), targetValue: target, operation: 'delete' }),
  })

  let z = ctx.root
  while (z !== null && z.value !== target) {
    push(ctx, {
      description: `At node ${z.value}: is ${target} smaller or larger?`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: true,
      state: baseState({ currentNode: toPublicNode(z), targetValue: target, path: pathIds(z), operation: 'delete' }),
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })
    z = target < z.value ? z.left : z.right
  }

  if (z === null) {
    push(ctx, {
      description: `${target} was not found in the tree. Nothing to delete.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({ targetValue: target, operation: 'delete' }),
      isFinalStep: true,
    })
    return ctx.snapshots
  }

  let y = z
  let yOriginalColor = y.color
  let x: WorkingNode | null
  let xParent: WorkingNode | null

  function transplant(u: WorkingNode, v: WorkingNode | null) {
    if (u.parent === null) ctx.root = v
    else if (u === u.parent.left) u.parent.left = v
    else u.parent.right = v
    if (v !== null) v.parent = u.parent
  }

  if (z.left === null) {
    x = z.right
    xParent = z.parent
    push(ctx, {
      description: `${z.value} has no left child. It is spliced out and replaced by its right child${x ? ` (${x.value})` : ' (none)'}.`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: true,
      state: baseState({ currentNode: toPublicNode(z), targetValue: target, path: pathIds(z), operation: 'delete' }),
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })
    transplant(z, z.right)
  } else if (z.right === null) {
    x = z.left
    xParent = z.parent
    push(ctx, {
      description: `${z.value} has no right child. It is spliced out and replaced by its left child (${z.left.value}).`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: true,
      state: baseState({ currentNode: toPublicNode(z), targetValue: target, path: pathIds(z), operation: 'delete' }),
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })
    transplant(z, z.left)
  } else {
    y = z.right
    while (y.left !== null) y = y.left
    yOriginalColor = y.color
    x = y.right
    push(ctx, {
      description: `${z.value} has two children. Its in-order successor is ${y.value} (leftmost node of the right subtree).`,
      pseudocodeLine: PSEUDOCODE_LINE.BST_INSERT,
      isPredictionRequired: true,
      state: baseState({ currentNode: toPublicNode(z), targetValue: target, path: pathIds(z), operation: 'delete' }),
      criticalJunctionType: CriticalJunctionType.BST_DIRECTION,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })
    if (y.parent === z) {
      xParent = y
    } else {
      xParent = y.parent
      transplant(y, y.right)
      y.right = z.right
      y.right.parent = y
    }
    transplant(z, y)
    y.left = z.left
    y.left.parent = y
    y.color = z.color
  }

  push(ctx, {
    description: `${target} deleted (replaced by ${y === z ? 'its child' : `successor ${y.value}`}, coloured ${yOriginalColor}).`,
    pseudocodeLine: PSEUDOCODE_LINE.ROOT_BLACK,
    isPredictionRequired: false,
    state: baseState({ targetValue: target, operation: 'delete' }),
  })

  if (yOriginalColor === 'BLACK') {
    fixupDelete(ctx, x, xParent, target)
  }

  if (ctx.root) ctx.root.color = 'BLACK'

  push(ctx, {
    description: `${target} deleted. Red-Black properties restored.`,
    pseudocodeLine: PSEUDOCODE_LINE.ROOT_BLACK,
    isPredictionRequired: false,
    state: baseState({ targetValue: target, operation: 'delete' }),
    isFinalStep: true,
  })

  return ctx.snapshots
}

/** Deep-clones a public RBNode tree into a working tree with real parent
 * object references, rooted at `parent` (null for the top-level call). */
function cloneToWorking(node: RBNode | null, parent: WorkingNode | null): WorkingNode | null {
  if (!node) return null
  const clone: WorkingNode = { value: node.value, id: node.id, color: node.color, left: null, right: null, parent }
  clone.left = cloneToWorking(node.left, clone)
  clone.right = cloneToWorking(node.right, clone)
  return clone
}

function fixupDelete(ctx: EngineContext, startX: WorkingNode | null, startXParent: WorkingNode | null, target: number) {
  let x = startX
  let xParent = startXParent

  while (x !== ctx.root && !isRed(x)) {
    if (xParent === null) break

    if (x === xParent.left) {
      let sibling = xParent.right!

      push(ctx, {
        description: `${xParent.value}'s left subtree is short one black node. Its sibling ${sibling.value} is ${sibling.color}.`,
        pseudocodeLine: PSEUDOCODE_LINE.FIXUP_LOOP,
        isPredictionRequired: true,
        state: baseState({
          currentNode: toPublicNode(xParent),
          targetValue: target,
          path: pathIds(xParent),
          operation: 'delete',
          uncleNodeId: sibling.id,
          uncleColor: sibling.color,
        }),
        criticalJunctionType: CriticalJunctionType.RB_COLOR_DECISION,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })

      if (sibling.color === 'RED') {
        sibling.color = 'BLACK'
        xParent.color = 'RED'
        push(ctx, {
          description: `Case 1: sibling ${sibling.value} is RED. Recoloured and left-rotated ${xParent.value}.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_1,
          isPredictionRequired: false,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'left-rotate' }),
        })
        leftRotate(ctx, xParent)
        sibling = xParent.right!
      }

      if (!isRed(sibling.left) && !isRed(sibling.right)) {
        sibling.color = 'RED'
        push(ctx, {
          description: `Case 2: sibling ${sibling.value}'s children are both BLACK. Recoloured the sibling RED and moved the shortage up.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_2,
          isPredictionRequired: true,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'recolor' }),
          criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        })
        x = xParent
        xParent = xParent.parent
      } else {
        if (!isRed(sibling.right)) {
          if (sibling.left) sibling.left.color = 'BLACK'
          sibling.color = 'RED'
          push(ctx, {
            description: `Case 3: sibling ${sibling.value}'s near child is RED, far child is BLACK. Recoloured and right-rotated the sibling.`,
            pseudocodeLine: PSEUDOCODE_LINE.CASE_3,
            isPredictionRequired: true,
            state: baseState({ currentNode: toPublicNode(sibling), targetValue: target, operation: 'delete', fixupOperation: 'right-rotate' }),
            criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          })
          rightRotate(ctx, sibling)
          sibling = xParent.right!
        }
        sibling.color = xParent.color
        xParent.color = 'BLACK'
        if (sibling.right) sibling.right.color = 'BLACK'
        push(ctx, {
          description: `Case 4: sibling ${sibling.value}'s far child is RED. Recoloured and left-rotated ${xParent.value} - the shortage is resolved.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_3,
          isPredictionRequired: false,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'left-rotate' }),
        })
        leftRotate(ctx, xParent)
        x = ctx.root
        xParent = null
      }
    } else {
      let sibling = xParent.left!

      push(ctx, {
        description: `${xParent.value}'s right subtree is short one black node. Its sibling ${sibling.value} is ${sibling.color}.`,
        pseudocodeLine: PSEUDOCODE_LINE.FIXUP_LOOP,
        isPredictionRequired: true,
        state: baseState({
          currentNode: toPublicNode(xParent),
          targetValue: target,
          path: pathIds(xParent),
          operation: 'delete',
          uncleNodeId: sibling.id,
          uncleColor: sibling.color,
        }),
        criticalJunctionType: CriticalJunctionType.RB_COLOR_DECISION,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      })

      if (sibling.color === 'RED') {
        sibling.color = 'BLACK'
        xParent.color = 'RED'
        push(ctx, {
          description: `Case 1 (mirror): sibling ${sibling.value} is RED. Recoloured and right-rotated ${xParent.value}.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_1,
          isPredictionRequired: false,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'right-rotate' }),
        })
        rightRotate(ctx, xParent)
        sibling = xParent.left!
      }

      if (!isRed(sibling.right) && !isRed(sibling.left)) {
        sibling.color = 'RED'
        push(ctx, {
          description: `Case 2 (mirror): sibling ${sibling.value}'s children are both BLACK. Recoloured the sibling RED and moved the shortage up.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_2,
          isPredictionRequired: true,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'recolor' }),
          criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        })
        x = xParent
        xParent = xParent.parent
      } else {
        if (!isRed(sibling.left)) {
          if (sibling.right) sibling.right.color = 'BLACK'
          sibling.color = 'RED'
          push(ctx, {
            description: `Case 3 (mirror): sibling ${sibling.value}'s near child is RED, far child is BLACK. Recoloured and left-rotated the sibling.`,
            pseudocodeLine: PSEUDOCODE_LINE.CASE_3,
            isPredictionRequired: true,
            state: baseState({ currentNode: toPublicNode(sibling), targetValue: target, operation: 'delete', fixupOperation: 'left-rotate' }),
            criticalJunctionType: CriticalJunctionType.RB_ROTATION_RECOLOR,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          })
          leftRotate(ctx, sibling)
          sibling = xParent.left!
        }
        sibling.color = xParent.color
        xParent.color = 'BLACK'
        if (sibling.left) sibling.left.color = 'BLACK'
        push(ctx, {
          description: `Case 4 (mirror): sibling ${sibling.value}'s far child is RED. Recoloured and right-rotated ${xParent.value} - the shortage is resolved.`,
          pseudocodeLine: PSEUDOCODE_LINE.CASE_3,
          isPredictionRequired: false,
          state: baseState({ currentNode: toPublicNode(xParent), targetValue: target, operation: 'delete', fixupOperation: 'right-rotate' }),
        })
        rightRotate(ctx, xParent)
        x = ctx.root
        xParent = null
      }
    }
  }

  if (x !== null) x.color = 'BLACK'
}
