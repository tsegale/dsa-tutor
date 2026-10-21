import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot, GraphAlgorithmState, GridAlgorithmState } from '@dsa-tutor/types'
import type { BSTNode } from '@/engine/bst'
import type { TraversalState } from '@/engine/treeTraversal'
import { correctTileIdFor } from '@/utils/correctTile'

/**
 * Hands-on by SELECTION: pointing at the thing the algorithm would pick.
 *
 * Hands-on mode had one interaction, dragging a bar, and it only exists
 * on the array canvases. Every other structural category fell back to
 * "this structure's own operations in the controls are the hands-on
 * work", which is a fair description of pressing Insert and a poor
 * description of carrying the step out: the learner pressed a button and
 * watched the algorithm make the decision for them.
 *
 * A tree, a graph and a grid all have the same gesture available, and it
 * is the one the algorithm is actually making: choose the next thing.
 * Which node do we descend to, which node comes off the frontier, which
 * cell is dequeued. One declaration here, three canvases rendering it,
 * rather than three implementations of the same idea.
 *
 * The answers are the ids the GRADER uses - correctTileIdFor's - so a
 * pointed answer and a clicked tile are judged by one rule and hands-on
 * cannot drift into a second, differently graded answer key.
 *
 * Note what that does NOT mean. The tile grid shows the right answer plus
 * two or three sampled distractors; the canvas offers every real
 * candidate, because that is the choice the algorithm is actually making
 * and sampling it would be a strange thing to do to a picture the learner
 * is already looking at. Pointing at a candidate the tile grid did not
 * happen to sample is a wrong answer, which is correct, rather than an
 * unrecognised one.
 *
 * The invariant that matters, and that handsOnSelection.test.ts holds for
 * every junction every topic reaches: the correct answer is always among
 * the things that can be pointed at. A gesture that cannot express the
 * right answer is worse than no gesture.
 */

export type HandsOnSelectionKind = 'tree' | 'graph' | 'grid'

export interface HandsOnSelection {
  kind: HandsOnSelectionKind
  /**
   * What is clickable, by the key its canvas identifies it with, and the
   * answer id that choosing it submits. A tree keys by node id, a graph
   * by node id, a grid by "row,col".
   */
  choices: Record<string, string>
  /** One line naming the gesture, shown where the tiles would be. */
  hint: string
}

function treeNodes(root: BSTNode | null | undefined): BSTNode[] {
  if (!root) return []
  return [root, ...treeNodes(root.left), ...treeNodes(root.right)]
}

/**
 * The selection for this junction, or null when it has none - in which
 * case the junction keeps its tiles, in hands-on mode as anywhere else.
 * A conceptual junction ("what is now guaranteed about the tree?") has
 * nothing on the canvas to point at, and inventing a gesture for it would
 * be worse than the tiles it replaced.
 */
export function handsOnSelectionFor(snapshot: AlgorithmSnapshot | null | undefined): HandsOnSelection | null {
  if (!snapshot || !snapshot.isPredictionRequired) return null
  const state = snapshot.dataStructureState

  /**
   * A selection is only offered when the right answer is one of the
   * things on it. DFS takes the most recently discovered node, which can
   * already be marked visited by the time the junction is asked, so
   * filtering by "not visited" quietly dropped the correct node and left
   * a gesture that could only ever be wrong.
   */
  const offer = (selection: HandsOnSelection): HandsOnSelection | null => {
    const correct = correctTileIdFor(snapshot)
    if (correct === null) return null
    const answers = Object.values(selection.choices)
    if (!answers.includes(correct)) return null
    return answers.length > 1 ? selection : null
  }

  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.VISIT_NODE: {
      // Click the node the traversal visits next. Every candidate is a
      // real node already on screen, which is what makes this the
      // clearest of the three: there is nothing to imagine.
      const s = state as TraversalState
      if (s.nextVisitValue === null || s.nextVisitValue === undefined) return null
      const visited = new Set(s.visitedOrder)
      const choices: Record<string, string> = {}
      for (const node of treeNodes(s.root)) {
        if (visited.has(node.value)) continue
        choices[node.id] = String(node.value)
      }
      return offer({ kind: 'tree', choices, hint: 'Click the node this traversal visits next.' })
    }

    case CriticalJunctionType.BST_DIRECTION: {
      const s = state as {
        currentNode: (BSTNode & { left?: BSTNode | null; right?: BSTNode | null }) | null
        deleteCase?: string
      }
      // The delete-case junction asks how a node is removed, not which
      // way to descend: no child to point at.
      if (s.deleteCase || !s.currentNode) return null
      const choices: Record<string, string> = {}
      if (s.currentNode.left) choices[s.currentNode.left.id] = 'go-left'
      if (s.currentNode.right) choices[s.currentNode.right.id] = 'go-right'
      // One child only would make the gesture a single button that is
      // always right, which asks nothing.
      // Both children must exist: one child only would be a single
      // button that is always right, which asks nothing.
      if (Object.keys(choices).length !== 2) return null
      return offer({ kind: 'tree', choices, hint: 'Click the child this comparison descends to.' })
    }

    case CriticalJunctionType.NEXT_NODE_SELECTION:
    case CriticalJunctionType.TOPOLOGICAL_ORDER: {
      const s = state as GraphAlgorithmState & { queue?: string[]; graph?: Record<string, string[]> }
      const visited = new Set(s.visited ?? [])
      const placed = new Set(s.topoOrder ?? [])
      const all = s.nodes ? s.nodes.map((node) => node.id) : Object.keys(s.graph ?? {})
      const isTopo = snapshot.criticalJunctionType === CriticalJunctionType.TOPOLOGICAL_ORDER
      const settled = isTopo ? placed : visited
      const correct = correctTileIdFor(snapshot)
      const choices: Record<string, string> = {}
      for (const id of all) {
        // The node the run is about to take stays pointable even when it
        // is already marked settled, which DFS's is.
        if (settled.has(id) && id !== correct) continue
        choices[id] = id
      }
      return offer({
        kind: 'graph',
        choices,
        hint: isTopo
          ? 'Click the node that goes into the order next.'
          : 'Click the node that comes off the frontier next.',
      })
    }

    case CriticalJunctionType.GRID_NEXT_CELL: {
      const s = state as GridAlgorithmState
      const frontier = s.frontierCells ?? []
      if (frontier.length < 2) return null
      const choices: Record<string, string> = {}
      for (const [row, col] of frontier) choices[`${row},${col}`] = `${row},${col}`
      return offer({ kind: 'grid', choices, hint: 'Click the frontier cell this search takes next.' })
    }

    default:
      return null
  }
}
