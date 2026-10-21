import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import type { CallFrame, CallStackState } from '@/engine/recursionFactorial'

/**
 * The call tree of a recursive run, reconstructed from the whole snapshot
 * sequence.
 *
 * A snapshot carries only the live stack: a frame is popped once it
 * returns. That is the right shape for a stack drawer and the wrong one
 * for Fibonacci, whose entire lesson is the branching and the overlap -
 * fib(6) makes 25 calls to answer a question with 7 distinct answers. Shown
 * as a stack, that explosion is invisible; the student sees a column that
 * grows and shrinks and never sees the same subproblem being solved again.
 *
 * So the tree is built once from every snapshot in the run, laid out once,
 * and only the node states change as the student steps. A layout that grew
 * with the run would shift every node sideways on each call, which is
 * unreadable; showing the whole shape dimmed and filling it in is both
 * steadier and closer to the point.
 */

export interface CallTreeNode {
  id: string
  argument: number
  /** The frame's display label, when it set one (see CallFrame.label). */
  label?: string
  depth: number
  parentId: string | null
  /** The step at which this call was first made. */
  bornAt: number
  returnValue: number | null
  /** On the stack at the current step. */
  live: boolean
  /** The frame executing at the current step. */
  current: boolean
  /** Has returned by the current step. */
  returned: boolean
  /** Not yet called at the current step. */
  pending: boolean
  /**
   * An earlier call with the same argument was made before this one. This
   * subtree is recomputing an answer the run already worked out, which is
   * the reason memoisation exists and the thing fib's complexity measures.
   */
  recomputed: boolean
  /** Layout, in a unit grid: x is the leaf slot, y is the depth. */
  x: number
  y: number
}

export interface CallTree {
  nodes: CallTreeNode[]
  /** Grid extent, for scaling into whatever space the canvas has. */
  columns: number
  rows: number
  /** Calls made so far, and calls in the whole run. */
  callsSoFar: number
  totalCalls: number
}

function stateOf(snapshot: AlgorithmSnapshot | undefined): CallStackState | null {
  const state = snapshot?.dataStructureState
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  const frames = (state as CallStackState).frames
  return Array.isArray(frames) ? (state as CallStackState) : null
}

interface Discovered {
  frame: CallFrame
  parentId: string | null
  bornAt: number
  returnValue: number | null
}

/**
 * Every call the run ever makes, in the order it makes them. A frame's
 * parent is the frame one level below it on the stack at the moment it
 * appeared, which is exactly what called it.
 */
function discover(snapshots: readonly AlgorithmSnapshot[]): Map<string, Discovered> {
  const found = new Map<string, Discovered>()
  snapshots.forEach((snapshot, step) => {
    const state = stateOf(snapshot)
    if (!state) return
    state.frames.forEach((frame, position) => {
      const existing = found.get(frame.id)
      if (existing) {
        // Keep the last return value seen: a frame is popped after it
        // returns, so the final snapshot holding it has the answer.
        if (frame.returnValue !== null) existing.returnValue = frame.returnValue
        return
      }
      let parentId: string | null = null
      for (let i = position - 1; i >= 0; i -= 1) {
        if (state.frames[i].depth === frame.depth - 1) {
          parentId = state.frames[i].id
          break
        }
      }
      found.set(frame.id, { frame, parentId, bornAt: step, returnValue: frame.returnValue })
    })
  })
  return found
}

/**
 * x by leaf slot: each leaf takes the next column, and a parent sits
 * centred over its children. The standard tidy layout, which keeps
 * siblings adjacent and never crosses an edge.
 */
function layout(nodes: CallTreeNode[]): number {
  const children = new Map<string | null, CallTreeNode[]>()
  for (const node of nodes) {
    const list = children.get(node.parentId) ?? []
    list.push(node)
    children.set(node.parentId, list)
  }
  // Births are in call order, which for a depth-first recursion is also
  // left-to-right order among siblings.
  for (const list of children.values()) list.sort((a, b) => a.bornAt - b.bornAt)

  let nextSlot = 0
  const place = (node: CallTreeNode): number => {
    const kids = children.get(node.id) ?? []
    if (kids.length === 0) {
      node.x = nextSlot
      nextSlot += 1
      return node.x
    }
    const positions = kids.map(place)
    node.x = (positions[0] + positions[positions.length - 1]) / 2
    return node.x
  }
  for (const root of children.get(null) ?? []) place(root)
  return nextSlot
}

export function buildCallTree(snapshots: readonly AlgorithmSnapshot[], stepIndex: number): CallTree | null {
  if (snapshots.length === 0) return null
  const discovered = discover(snapshots)
  if (discovered.size === 0) return null

  const live = stateOf(snapshots[stepIndex])
  // Presence in the frames array is not liveness: a frame is shown with
  // status 'returned' for the step that reports its answer before it is
  // popped, and the final step leaves the root sitting there returned. A
  // node called live at that point would be drawn as still executing
  // after the run had finished.
  const liveIds = new Set(
    live?.frames.filter((frame) => frame.status !== 'returned').map((frame) => frame.id) ?? [],
  )
  const currentId = live?.currentFrameId ?? null

  // An argument counts as recomputed from its second call onward, in call
  // order. The first call works the answer out; every later one repeats it.
  const seenArguments = new Set<number>()
  const inBirthOrder = [...discovered.values()].sort((a, b) => a.bornAt - b.bornAt)
  const recomputedIds = new Set<string>()
  for (const entry of inBirthOrder) {
    if (seenArguments.has(entry.frame.argument)) recomputedIds.add(entry.frame.id)
    else seenArguments.add(entry.frame.argument)
  }

  const nodes: CallTreeNode[] = inBirthOrder.map((entry) => {
    const pending = entry.bornAt > stepIndex
    const liveNow = !pending && liveIds.has(entry.frame.id)
    return {
      id: entry.frame.id,
      argument: entry.frame.argument,
      label: entry.frame.label,
      depth: entry.frame.depth,
      parentId: entry.parentId,
      bornAt: entry.bornAt,
      returnValue: entry.returnValue,
      live: liveNow,
      current: !pending && entry.frame.id === currentId,
      returned: !pending && !liveNow,
      pending,
      recomputed: recomputedIds.has(entry.frame.id),
      x: 0,
      y: entry.frame.depth,
    }
  })

  const columns = layout(nodes)
  const rows = nodes.reduce((deepest, node) => Math.max(deepest, node.depth), 0) + 1

  return {
    nodes,
    columns: Math.max(columns, 1),
    rows,
    callsSoFar: nodes.filter((node) => !node.pending).length,
    totalCalls: nodes.length,
  }
}

/** The live stack, deepest call last, for the drawer beside the tree. */
export function liveStack(snapshots: readonly AlgorithmSnapshot[], stepIndex: number): CallFrame[] {
  return stateOf(snapshots[stepIndex])?.frames ?? []
}

/**
 * How much of the work was repeated: distinct arguments against calls
 * made. The single number that makes the case for memoisation.
 */
export function redundancy(tree: CallTree): { distinct: number; calls: number } {
  return { distinct: new Set(tree.nodes.map((node) => node.argument)).size, calls: tree.totalCalls }
}
