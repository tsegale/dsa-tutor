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
