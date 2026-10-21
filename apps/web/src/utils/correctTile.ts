import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'

/**
 * The id of the right tile at a junction, worked out from the snapshot's own
 * state with the same rules the AI service's evaluate_answer uses. Used to
 * reveal the answer on request, and to tell the feedback validator which
 * option text must not appear while the student can still try again.
 *
 * Conceptual junctions never change the id with display order, so their
 * right tile is always 'correct'. Returns null for a junction whose
 * state-dependent ids this module does not cover (non-study algorithms).
 */
export function correctTileIdFor(snapshot: AlgorithmSnapshot): string | null {
  const ds = snapshot.dataStructureState
  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.SWAP_DECISION: {
      if (isInsertionState(ds)) {
        const compare = ds.array[ds.compareIndex]
        return compare === undefined ? null : ds.currentKey < compare ? 'shift' : 'stop'
      }
      const array = ds as number[]
      const [i, j] = snapshot.activeIndices
      if (array[i] === undefined || array[j] === undefined) return null
      return array[i] > array[j] ? 'swap' : 'no-swap'
    }
    case CriticalJunctionType.MIDPOINT_DECISION: {
      const s = ds as { array: number[]; mid: number | null; target: number }
      if (s.mid === null) return null
      const value = s.array[s.mid]
      return value === s.target ? 'found' : s.target < value ? 'search-left' : 'search-right'
    }
    case CriticalJunctionType.BST_DIRECTION: {
      const s = ds as {
        currentNode: { value: number } | null
        targetValue: number
        insertionParentValue?: number | null
        deleteCase?: string
      }
      if (s.deleteCase) return 'correct'
      if (s.currentNode === null) {
        if (s.insertionParentValue == null) return 'becomes-root'
        // Equal values go right in this tree.
        return s.targetValue < s.insertionParentValue ? 'attach-left' : 'attach-right'
      }
      return s.targetValue < s.currentNode.value ? 'go-left' : 'go-right'
    }
    // The four selection junctions. Their answers were missing here, so
    // the client had no verdict for them at all: the answer could not be
    // revealed on request, the feedback validator had no option text to
    // withhold, and hands-on by pointing had nothing to build on. Each
    // rule is the one its engine follows, and tileCoverage asserts the
    // tile grid marks the same option correct.
    case CriticalJunctionType.VISIT_NODE: {
      const s = ds as { nextVisitValue?: number | null }
      return s.nextVisitValue === null || s.nextVisitValue === undefined ? null : String(s.nextVisitValue)
    }
    case CriticalJunctionType.NEXT_NODE_SELECTION: {
      // BFS's frontier is a queue, DFS's a stack. discoveryTime is only
      // ever populated by DFS, which is how the two are told apart
      // without a dedicated field - the same test tileBuilder makes.
      const s = ds as { queue?: string[]; frontier?: string[]; discoveryTime?: Record<string, number> }
      const list = s.queue ?? s.frontier ?? []
      if (list.length === 0) return null
      return s.discoveryTime !== undefined ? list[list.length - 1] : list[0]
    }
    case CriticalJunctionType.TOPOLOGICAL_ORDER: {
      const s = ds as { currentNode?: string | null }
      return s.currentNode ?? null
    }
    case CriticalJunctionType.GRID_NEXT_CELL: {
      const s = ds as {
        frontierCells?: [number, number][]
        grid?: { gScore?: number; hScore?: number }[][]
        algorithmType?: string
      }
      const frontier = s.frontierCells ?? []
      if (frontier.length === 0) return null
      const priority = ([row, col]: [number, number]) => {
        const cell = s.grid?.[row]?.[col]
        const g = cell?.gScore ?? 0
        return s.algorithmType === 'astar' ? g + (cell?.hScore ?? 0) : g
      }
      // BFS takes the front of the queue and DFS the back; the weighted
      // pair take the lowest priority score.
      if (s.algorithmType === 'bfs') return `${frontier[0][0]},${frontier[0][1]}`
      if (s.algorithmType === 'dfs') {
        const last = frontier[frontier.length - 1]
        return `${last[0]},${last[1]}`
      }
      const best = frontier.reduce((a, b) => (priority(b) < priority(a) ? b : a))
      return `${best[0]},${best[1]}`
    }
    case CriticalJunctionType.PIVOT_SELECTION:
    case CriticalJunctionType.PASS_COMPLETE:
    case CriticalJunctionType.EARLY_TERMINATION:
    case CriticalJunctionType.ALGORITHM_COMPLETE:
    case CriticalJunctionType.COMPLEXITY_PREDICTION:
      return 'correct'
    default:
      return null
  }
}

function isInsertionState(ds: unknown): ds is { array: number[]; compareIndex: number; currentKey: number } {
  return typeof ds === 'object' && ds !== null && !Array.isArray(ds) && 'currentKey' in ds && 'compareIndex' in ds
}
