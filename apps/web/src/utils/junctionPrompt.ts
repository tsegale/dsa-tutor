import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import type { AVLState } from '@/engine/avlTree'
import type { RBState } from '@/engine/redBlackTree'
import type { BellmanFordState } from '@/engine/bellmanFord'

export const SEARCH_ALGORITHM_NAMES = new Set(['Linear Search', 'Binary Search'])

/** Shape shared by LinearSearchState and BinarySearchState - the only
 * fields the ALGORITHM_COMPLETE tiles/prompt need for either. */
export interface SearchAlgorithmState {
  found: boolean
  foundIndex: number | null
}

export function isInsertionSortSwapState(
  state: unknown,
): state is { array: number[]; currentKey: number; compareIndex: number } {
  return typeof state === 'object' && state !== null && 'currentKey' in state
}

/** The question shown above the tiles, read before the learner chooses.
 * Never derived from snapshot.description: several engines' descriptions
 * state the outcome of the junction (e.g. "a swap is needed"), which would
 * hand the student the answer to the question being asked. */
export function getPromptForSnapshot(snapshot: AlgorithmSnapshot, algorithmName: string): string {
  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.SWAP_DECISION: {
      const state = snapshot.dataStructureState
      if (isInsertionSortSwapState(state)) {
        const compareVal = state.array[state.compareIndex]
        return `The algorithm is comparing the key (${state.currentKey}) with the element at index ${state.compareIndex} (value ${compareVal}). What happens next?`
      }
      const arr = state as number[]
      const [i, j] = snapshot.activeIndices
      return `The algorithm is comparing index ${i} (value ${arr[i]}) and index ${j} (value ${arr[j]}). What should happen next?`
    }

    case CriticalJunctionType.PASS_COMPLETE:
      if (algorithmName === 'Selection Sort') return 'What happens when the scan pass is complete?'
      if (algorithmName === 'Insertion Sort') {
        return 'The key has reached its final position. What is now guaranteed about the array?'
      }
      if (algorithmName === 'Merge Sort') return 'What is guaranteed about the merged regions?'
      return 'This pass is now complete. What can we guarantee about the array?'

    case CriticalJunctionType.EARLY_TERMINATION:
      return 'The algorithm stopped before completing all passes. Why?'

    case CriticalJunctionType.ALGORITHM_COMPLETE: {
      if (SEARCH_ALGORITHM_NAMES.has(algorithmName)) {
        const state = snapshot.dataStructureState as SearchAlgorithmState
        return state.found
          ? `${algorithmName} has finished. What confirms the target was correctly located?`
          : `${algorithmName} has finished without finding the target. What confirms the search correctly covered the whole space?`
      }
      return `${algorithmName} has finished. What proves the array is fully sorted?`
    }

    case CriticalJunctionType.TARGET_CHECK: {
      const s = snapshot.dataStructureState as { array: number[]; currentIndex: number; target: number }
      return `Checking index ${s.currentIndex} (value ${s.array[s.currentIndex]}) against the target ${s.target}. What should happen next?`
    }

    case CriticalJunctionType.MIDPOINT_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; mid: number | null; target: number }
      const midVal = s.mid !== null ? s.array[s.mid] : undefined
      return `The midpoint is index ${s.mid} (value ${midVal}), and the target is ${s.target}. What should happen next?`
    }

    case CriticalJunctionType.NEW_MINIMUM: {
      const s = snapshot.dataStructureState as { array: number[]; scanIndex: number; currentMin: number }
      return `Is index ${s.scanIndex} (value ${s.array[s.scanIndex]}) smaller than the current minimum at index ${s.currentMin} (value ${s.array[s.currentMin]})?`
    }

    case CriticalJunctionType.MERGE_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; leftRegion: [number, number]; rightRegion: [number, number] }
      const leftVal = s.array[s.leftRegion[0]]
      const rightVal = s.array[s.rightRegion[0]]
      return `Comparing ${leftVal} (left run) with ${rightVal} (right run). Which goes into the merged result first?`
    }

    case CriticalJunctionType.PARTITION_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; leftPointer: number; pivotValue: number }
      return `Comparing index ${s.leftPointer} (value ${s.array[s.leftPointer]}) with the pivot ${s.pivotValue}. What happens next?`
    }

    case CriticalJunctionType.BST_DIRECTION: {
      const s = snapshot.dataStructureState as { currentNode: { value: number } | null; targetValue: number }
      // This tree's convention (matching bst.ts's own insert/search logic)
      // sends a value equal to the current node right, not left - stated
      // explicitly here so a student taught the opposite convention isn't
      // marked wrong without ever being told which one this tree uses.
      return s.currentNode === null
        ? `Reached an empty position. Where does ${s.targetValue} belong?`
        : `At node ${s.currentNode.value}: is ${s.targetValue} smaller, or greater than or equal to it? (Equal values go right in this tree.)`
    }

    case CriticalJunctionType.NEXT_NODE_SELECTION:
      return 'Which node gets dequeued next?'

    case CriticalJunctionType.AVL_BALANCE_CHECK: {
      const s = snapshot.dataStructureState as AVLState
      return `Back at node ${s.currentNode?.value}: height is now ${s.currentNode?.height}. Is this node balanced?`
    }

    case CriticalJunctionType.AVL_ROTATION_TYPE: {
      const s = snapshot.dataStructureState as AVLState
      return `Node ${s.currentNode?.value} is unbalanced (balance factor ${s.balanceFactor}). Which rotation restores balance?`
    }

    case CriticalJunctionType.RB_COLOR_DECISION: {
      const s = snapshot.dataStructureState as RBState
      return `Node ${s.currentNode?.value} has a violation nearby. Is the relevant uncle/sibling node RED or BLACK?`
    }

    case CriticalJunctionType.RB_ROTATION_RECOLOR: {
      const s = snapshot.dataStructureState as RBState
      return `What fix-up operation resolves the violation at node ${s.currentNode?.value}?`
    }

    case CriticalJunctionType.BELLMAN_PASS_COMPLETE: {
      const s = snapshot.dataStructureState as BellmanFordState
      return `Pass ${s.passNumber} of ${s.totalPasses} complete. Did any distance change, or has the algorithm converged?`
    }

    default:
      // Every Foundations engine already writes a specific, well-formed
      // question into the snapshot's own description (e.g. "What does
      // pop() return?") - falling back to that instead of a generic
      // string means a new junction type gets a real prompt for free,
      // without a dedicated case here.
      return snapshot.description || 'What happens next?'
  }
}
