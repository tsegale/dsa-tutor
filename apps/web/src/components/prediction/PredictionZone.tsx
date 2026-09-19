import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType, JunctionDifficulty, MisconceptionCategory, PredictionType, ScaffoldingLevel } from '@dsa-tutor/types'
import type {
  AlgorithmSnapshot,
  CodeEvalResponse,
  HintRequest,
  PredictionRequest,
} from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { submitPrediction, requestHint } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import { cn } from '@/lib/utils'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { firstSentence } from '@/utils/predictionJunction'
import { getHandsOnInstructionText } from '@/utils/handsOnInstructions'
import {
  getPromptForSnapshot,
  isInsertionSortSwapState,
  SEARCH_ALGORITHM_NAMES,
  type SearchAlgorithmState,
} from '@/utils/junctionPrompt'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import type { BSTNode } from '@/engine/bst'
import type { TraversalState } from '@/engine/treeTraversal'
import type { AVLState } from '@/engine/avlTree'
import type { HeapState } from '@/engine/heap'
import type { TrieState } from '@/engine/trie'
import type { GraphAlgorithmState, GridAlgorithmState } from '@dsa-tutor/types'
import type { DijkstraState } from '@/engine/dijkstra'
import type { BellmanFordState } from '@/engine/bellmanFord'
import type { MatrixState } from '@/engine/floydWarshall'
import type { KruskalState } from '@/engine/kruskal'
import type { PrimState } from '@/engine/prim'
import type { CycleDetectionState, ConnectedComponentsState } from '@/engine/graphProperties'
import XPToast from '@/components/ui/XPToast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import HintAvatar, { DISMISS_HINT_EVENT } from './HintAvatar'
import ValueInput from './ValueInput'
import TileGrid, { type TileOption } from './TileGrid'
import CodeEditorInput from './CodeEditorInput'

export interface PredictionOutcomeDetail {
  correct: boolean
  stepIndex: number
  predictionSubmitted: string
  misconceptionCategory: MisconceptionCategory | null
  hintsRequestedForStep: number
  timeSpentSeconds: number
  junctionType: CriticalJunctionType
  junctionDifficulty: JunctionDifficulty
  /** True when this submission hit the attempt cap and had its answer
   * revealed automatically - the research-data signal for "this junction
   * was never solved independently", distinct from a correct answer
   * reached after retries. */
  bottomedOut: boolean
  /** True for every Code Editor submission (correct or not). Tells the page
   * level to skip the tile-flow's computeMistakePath fallback entirely -
   * a code-eval outcome drives the canvas only via codeEvalBuggyState. */
  isCodeEval?: boolean
  /** Set only for an incorrect, visualisable Code Editor submission - the
   * array state the student's buggy code actually produces, so the page
   * level can play it on the canvas via the Phase 15 mistake path. */
  codeEvalBuggyState?: { resultingState: number[]; activeIndices: number[] } | null
}

const CODE_EVAL_XP = 5

interface PredictionZoneProps {
  onSubmit: (answer: string) => void
  onHintRequested?: () => void
  onPredictionResult?: (detail: PredictionOutcomeDetail) => void
  // Mistake state is owned by the page level now, so the AI Tutor tab
  // (RightPanel) can render the same MisconceptionToast without floating
  // it over the canvas a second time - PredictionZone only ever writes
  // it here, RightPanel is what reads it for display.
  setMistakeAnalysis: (value: string | null) => void
  setMistakeHint: (value: string | null) => void
  setMistakeCounterfactual: (value: string | null) => void
  // Hint text is also lifted so the Socratic guidance box in RightPanel
  // can show it, but PredictionZone still reads it too (HintAvatar).
  hint: string | null
  setHint: (value: string | null) => void
  // Lifted so RightPanel's Socratic guidance box knows whether it's safe to
  // show the current step's narration description - true once the answer
  // is no longer being withheld (correct, or revealed after the attempt
  // cap), false while a prediction is still pending. Showing the
  // description before that would hand the student the answer.
  setPredictionResolved: (value: boolean) => void
}

export const CLEAR_CANVAS_SELECTION_EVENT = 'dsa-tutor:clear-canvas-selection'
export const REQUEST_HINT_EVENT = 'request-hint'
export const ESCAPE_EVENT = 'dsa-tutor:escape'
export const SHOW_EXPLANATION_LINK_EVENT = 'dsa-tutor:show-explanation-link'
export const HANDS_ON_ANSWER_EVENT = 'dsa-tutor:hands-on-answer'

// Every junction ArrayCanvas's getHandsOnDragTarget recognises a drag
// interaction for - keep this list in sync with that function's cases.
const HANDS_ON_DRAG_JUNCTIONS: Set<CriticalJunctionType> = new Set([
  CriticalJunctionType.SWAP_DECISION,
  CriticalJunctionType.NEW_MINIMUM,
  CriticalJunctionType.PARTITION_DECISION,
  CriticalJunctionType.MERGE_DECISION,
  CriticalJunctionType.GAP_COMPARISON,
  CriticalJunctionType.HEAP_COMPARE,
])

const PROACTIVE_HINT_DELAY_MS = 25000
const AUTO_RESET_DELAY_MS = 1200
const BOTTOM_OUT_ADVANCE_DELAY_MS = 1500

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fisher-Yates shuffle so the correct tile isn't always in the same position. Tile ids never change, only display order. */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * The entire Bubble Sort prediction interaction: SWAP_DECISION always
 * offers two neutral action tiles (neither reveals correctness); the
 * three conceptual junctions offer one correct claim plus three
 * research-grounded distractor misconceptions. Correctness lives in the
 * tile id only - shuffling changes display order, never which id is
 * correct, and the backend checks id, not position.
 */
function collectTreeValues(node: BSTNode | null): number[] {
  if (!node) return []
  return [...collectTreeValues(node.left), node.value, ...collectTreeValues(node.right)]
}

function getTilesForSnapshot(snapshot: AlgorithmSnapshot, algorithmName: string): TileOption[] {
  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.SWAP_DECISION: {
      const state = snapshot.dataStructureState
      if (isInsertionSortSwapState(state)) {
        return shuffleArray([
          {
            id: 'shift',
            label: 'Shift right - the key is smaller, move it left',
            misconception: MisconceptionCategory.ORDER_OF_OPERATIONS,
          },
          {
            id: 'stop',
            label: 'Stop - the key is in its correct position',
            misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
          },
        ])
      }
      return shuffleArray([
        { id: 'swap', label: 'Swap them', misconception: MisconceptionCategory.ORDER_OF_OPERATIONS },
        { id: 'no-swap', label: 'Leave them', misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION },
      ])
    }

    case CriticalJunctionType.PASS_COMPLETE:
      if (algorithmName === 'Merge Sort') {
        return shuffleArray([
          { id: 'correct', label: 'Each merged segment is sorted within itself', misconception: null },
          { id: 'wrong-1', label: 'The entire array is now sorted', misconception: MisconceptionCategory.PREMATURE_TERMINATION },
          {
            id: 'wrong-2',
            label: 'Left halves are sorted but right halves are not yet',
            misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
          },
          {
            id: 'wrong-3',
            label: 'Only adjacent pairs are guaranteed to be in order',
            misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
          },
        ])
      }
      return shuffleArray([
        {
          id: 'correct',
          label: 'The largest remaining unsorted element is now in its correct position',
          misconception: null,
        },
        { id: 'wrong-1', label: 'The entire array is now sorted', misconception: MisconceptionCategory.PREMATURE_TERMINATION },
        {
          id: 'wrong-2',
          label: 'The smallest element moved to the front',
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'wrong-3',
          label: 'Every element was compared exactly once',
          misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
        },
      ])

    case CriticalJunctionType.EARLY_TERMINATION:
      return shuffleArray([
        { id: 'correct', label: 'No swaps were needed - the array was already in order', misconception: null },
        {
          id: 'wrong-1',
          label: 'The algorithm completed the maximum number of passes',
          misconception: MisconceptionCategory.PREMATURE_TERMINATION,
        },
        {
          id: 'wrong-2',
          label: 'Equal elements caused the loop to stop',
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        {
          id: 'wrong-3',
          label: 'The first element reached its correct position',
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])

    case CriticalJunctionType.ALGORITHM_COMPLETE: {
      if (algorithmName === 'Counting Sort') {
        return shuffleArray([
          {
            id: 'correct',
            label: 'Every element was placed using its count-derived index, exactly once',
            misconception: null,
          },
          {
            id: 'wrong-1',
            label: 'Adjacent elements were compared and swapped',
            misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
          },
          {
            id: 'wrong-2',
            label: 'The array was recursively divided in half',
            misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
          },
          {
            id: 'wrong-3',
            label: 'A pivot was chosen and elements partitioned around it',
            misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
          },
        ])
      }
      if (algorithmName === 'Radix Sort (LSD)') {
        return shuffleArray([
          {
            id: 'correct',
            label: 'Every digit position was sorted (stably) from least to most significant',
            misconception: null,
          },
          {
            id: 'wrong-1',
            label: 'Elements were compared directly against each other',
            misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
          },
          {
            id: 'wrong-2',
            label: 'Only the most significant digit needed sorting',
            misconception: MisconceptionCategory.COMPARISON_DIRECTION,
          },
          {
            id: 'wrong-3',
            label: 'The buckets were collected in a different order each pass',
            misconception: MisconceptionCategory.STABILITY_CONFUSION,
          },
        ])
      }
      if (SEARCH_ALGORITHM_NAMES.has(algorithmName)) {
        const state = snapshot.dataStructureState as SearchAlgorithmState
        return state.found
          ? shuffleArray([
              {
                id: 'correct',
                label: `The element at index ${state.foundIndex} was confirmed equal to the target`,
                misconception: null,
              },
              {
                id: 'wrong-1',
                label: 'Every element in the array was visited',
                misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
              },
              {
                id: 'wrong-2',
                label: 'The array became sorted during the search',
                misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
              },
              {
                id: 'wrong-3',
                label: 'The target must appear at every index checked',
                misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
              },
            ])
          : shuffleArray([
              {
                id: 'correct',
                label: 'The entire valid search space was eliminated without a match',
                misconception: null,
              },
              {
                id: 'wrong-1',
                label: 'The array must be unsorted for the target to be missing',
                misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
              },
              {
                id: 'wrong-2',
                label: 'The target could still be found by starting over',
                misconception: MisconceptionCategory.PREMATURE_TERMINATION,
              },
              {
                id: 'wrong-3',
                label: 'One comparison is enough to prove absence',
                misconception: MisconceptionCategory.BOUNDARY_CONDITION,
              },
            ])
      }
      return shuffleArray([
        { id: 'correct', label: 'No adjacent pair is out of order anywhere in the array', misconception: null },
        {
          id: 'wrong-1',
          label: 'Every element was visited the same number of times',
          misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
        },
        {
          id: 'wrong-2',
          label: 'The first and last elements are in their correct positions',
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        {
          id: 'wrong-3',
          label: 'The total number of swaps equals the array length',
          misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION,
        },
      ])
    }

    case CriticalJunctionType.TARGET_CHECK: {
      const s = snapshot.dataStructureState as { array: number[]; currentIndex: number; target: number }
      const val = s.array[s.currentIndex]
      const target = s.target
      return shuffleArray([
        { id: 'match', label: `${val} equals ${target} - target found`, misconception: MisconceptionCategory.COMPARISON_DIRECTION },
        {
          id: 'no-match',
          label: `${val} does not equal ${target} - keep searching`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
      ])
    }

    case CriticalJunctionType.MIDPOINT_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; mid: number | null; target: number }
      const midVal = s.mid !== null ? s.array[s.mid] : undefined
      const target = s.target
      return shuffleArray([
        {
          id: 'search-left',
          label: `${target} is smaller - search the left half`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'search-right',
          label: `${target} is larger - search the right half`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        { id: 'found', label: `${midVal} equals ${target} - target found`, misconception: MisconceptionCategory.COMPARISON_DIRECTION },
      ])
    }

    case CriticalJunctionType.NEW_MINIMUM: {
      const s = snapshot.dataStructureState as { array: number[]; scanIndex: number; currentMin: number }
      const scanVal = s.array[s.scanIndex]
      const minVal = s.array[s.currentMin]
      return shuffleArray([
        {
          id: 'update',
          label: `${scanVal} is smaller than ${minVal} - update minimum`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'keep',
          label: `${scanVal} is not smaller - keep current minimum`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
      ])
    }

    case CriticalJunctionType.MERGE_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; leftRegion: [number, number]; rightRegion: [number, number] }
      const leftVal = s.array[s.leftRegion[0]]
      const rightVal = s.array[s.rightRegion[0]]
      // Same "competing claims, only one true" pattern already used by
      // MIDPOINT_DECISION and TARGET_CHECK: the wrong tile states a
      // false comparison, and the student's job is to recognise it.
      return shuffleArray([
        {
          id: 'take-left',
          label: `Take ${leftVal} from the left half - it is smaller`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'take-right',
          label: `Take ${rightVal} from the right half - it is smaller`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
      ])
    }

    case CriticalJunctionType.PARTITION_DECISION: {
      const s = snapshot.dataStructureState as { array: number[]; leftPointer: number; pivotValue: number }
      const leftVal = s.array[s.leftPointer]
      const pivotVal = s.pivotValue
      return shuffleArray([
        {
          id: 'swap',
          label: `${leftVal} is less than pivot ${pivotVal} - swap it leftward`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'skip',
          label: `${leftVal} is greater than or equal to pivot - leave it`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
      ])
    }

    case CriticalJunctionType.BST_DIRECTION: {
      const s = snapshot.dataStructureState as { currentNode: { value: number } | null; targetValue: number }
      const currentVal = s.currentNode?.value
      const targetVal = s.targetValue
      return shuffleArray([
        { id: 'go-left', label: `${targetVal} is less than ${currentVal} - go left`, misconception: MisconceptionCategory.COMPARISON_DIRECTION },
        {
          id: 'go-right',
          label: `${targetVal} is greater than ${currentVal} - go right`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'insert-here',
          label: 'This position is empty - insert here',
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    case CriticalJunctionType.VISIT_NODE: {
      const s = snapshot.dataStructureState as TraversalState
      const correct = s.nextVisitValue
      if (correct === null || correct === undefined) return []
      const visited = new Set(s.visitedOrder)
      const distractorPool = collectTreeValues(s.root).filter((v) => v !== correct && !visited.has(v))
      const distractors = shuffleArray(Array.from(new Set(distractorPool))).slice(0, 2)
      return shuffleArray([
        { id: String(correct), label: String(correct), misconception: null },
        ...distractors.map((d) => ({ id: String(d), label: String(d), misconception: MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION })),
      ])
    }

    case CriticalJunctionType.NEXT_NODE_SELECTION: {
      // Shared by three engines with different state shapes: the legacy
      // bfsEngine (BFSState: queue + graph), and the newer
      // bfsNodeGraphEngine/dfsNodeGraphEngine (GraphAlgorithmState:
      // frontier + nodes/adjacency). BFS's frontier is a FIFO queue (next
      // = front); DFS's is a LIFO stack (next = top) - discoveryTime only
      // ever gets populated by DFS, so its presence disambiguates which
      // end of `frontier` is "next" without a dedicated state field.
      const s = snapshot.dataStructureState as {
        queue?: string[]
        frontier?: string[]
        visited: string[]
        graph?: Record<string, string[]>
        nodes?: { id: string }[]
        discoveryTime?: Record<string, number>
      }
      const isLegacyBFS = s.queue !== undefined
      const isDFS = s.discoveryTime !== undefined
      const frontierList = isLegacyBFS ? s.queue! : (s.frontier ?? [])
      const nextNode = isDFS ? frontierList[frontierList.length - 1] : frontierList[0]
      const allNodeIds = isLegacyBFS ? Object.keys(s.graph ?? {}) : (s.nodes ?? []).map((n) => n.id)
      const distractors = allNodeIds.filter((n) => n !== nextNode && !s.visited.includes(n)).slice(0, 3)
      const reason = isDFS ? 'it is on top of the stack' : 'it was added to the queue first'
      return shuffleArray([
        { id: nextNode, label: `${nextNode} - ${reason}`, misconception: null },
        ...distractors.map((d) => ({ id: d, label: d, misconception: MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION })),
      ])
    }

    case CriticalJunctionType.AVL_BALANCE_CHECK: {
      const bf = (snapshot.dataStructureState as AVLState).balanceFactor ?? 0
      return shuffleArray([
        { id: 'balanced', label: `Balanced (BF = ${bf}, within -1 to 1)`, misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        {
          id: 'unbalanced',
          label: `Unbalanced (BF = ${bf}, outside -1 to 1)`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])
    }

    case CriticalJunctionType.AVL_ROTATION_TYPE: {
      return shuffleArray([
        { id: 'LL', label: 'LL rotation (left-heavy, single right rotation)', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        { id: 'RR', label: 'RR rotation (right-heavy, single left rotation)', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        { id: 'LR', label: 'LR rotation (left-heavy, rotate left then right)', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        { id: 'RL', label: 'RL rotation (right-heavy, rotate right then left)', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
      ])
    }

    case CriticalJunctionType.RB_COLOR_DECISION: {
      return shuffleArray([
        { id: 'recolor', label: 'Uncle is RED - recolour only (Case 1)', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        {
          id: 'rotate',
          label: 'Uncle is BLACK - rotation needed (Case 2 or 3)',
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])
    }

    case CriticalJunctionType.RB_ROTATION_RECOLOR: {
      return shuffleArray([
        {
          id: 'recolor',
          label: 'Recolour only - push the violation up two levels',
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        { id: 'left-rotate', label: 'Left-rotate', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        { id: 'right-rotate', label: 'Right-rotate', misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
      ])
    }

    case CriticalJunctionType.HEAP_SIFT_UP: {
      const s = snapshot.dataStructureState as HeapState
      const curr = s.array[s.currentIdx]
      const parentVal = s.parentIdx !== null ? s.array[s.parentIdx] : undefined
      return shuffleArray([
        { id: 'swap', label: `Swap ${curr} with parent ${parentVal}`, misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
        {
          id: 'stay',
          label: `Stay - ${curr} satisfies the heap property`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])
    }

    case CriticalJunctionType.HEAP_SIFT_DOWN: {
      const s = snapshot.dataStructureState as HeapState
      const curr = s.array[s.currentIdx]
      const options: TileOption[] = [
        { id: 'stay', label: `Stay - ${curr} satisfies the heap property`, misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION },
      ]
      if (s.leftChildIdx !== null)
        options.push({
          id: 'left',
          label: `Swap with left child (${s.array[s.leftChildIdx]})`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        })
      if (s.rightChildIdx !== null)
        options.push({
          id: 'right',
          label: `Swap with right child (${s.array[s.rightChildIdx]})`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        })
      return shuffleArray(options)
    }

    case CriticalJunctionType.TRIE_CHARACTER_MATCH: {
      const s = snapshot.dataStructureState as TrieState
      return shuffleArray([
        { id: 'exists', label: `'${s.currentChar}' exists as a child`, misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION },
        {
          id: 'missing',
          label: `'${s.currentChar}' does not exist`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    case CriticalJunctionType.TRIE_INSERT_NEW: {
      const s = snapshot.dataStructureState as TrieState
      return shuffleArray([
        {
          id: 'existing',
          label: `'${s.currentChar}' already exists - no new node needed`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
        {
          id: 'new',
          label: `'${s.currentChar}' needs a new node`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    case CriticalJunctionType.EDGE_RELAX: {
      const s = snapshot.dataStructureState as DijkstraState
      const currentDist = s.currentDist ?? Infinity
      const newDist = s.newDist ?? Infinity
      return shuffleArray([
        {
          id: 'relax',
          label: `Relax - new distance ${newDist} < current ${currentDist === Infinity ? '∞' : currentDist}`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        {
          id: 'skip',
          label: `Skip - current distance ${currentDist === Infinity ? '∞' : currentDist} is already optimal`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])
    }

    case CriticalJunctionType.BELLMAN_PASS_COMPLETE: {
      const s = snapshot.dataStructureState as BellmanFordState
      return shuffleArray([
        {
          id: 'continue',
          label: `Distances changed - continue (pass ${s.passNumber} of ${s.totalPasses})`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        {
          id: 'done',
          label: 'No changes - converged early, algorithm can stop',
          misconception: MisconceptionCategory.PREMATURE_TERMINATION,
        },
      ])
    }

    case CriticalJunctionType.MATRIX_UPDATE: {
      const s = snapshot.dataStructureState as MatrixState
      if (s.i === null || s.j === null || s.k === null) return []
      const throughK = s.dist[s.i][s.k] + s.dist[s.k][s.j]
      const current = s.dist[s.i][s.j]
      const kLabel = s.nodeIds[s.k]
      return shuffleArray([
        {
          id: 'update',
          label: `Update - via ${kLabel}: ${throughK} < current ${current === Infinity ? '∞' : current}`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
        {
          id: 'keep',
          label: `Keep - current ${current === Infinity ? '∞' : current} is already the shortest`,
          misconception: MisconceptionCategory.COMPARISON_DIRECTION,
        },
      ])
    }

    case CriticalJunctionType.UNION_FIND_CHECK: {
      const s = snapshot.dataStructureState as KruskalState
      return shuffleArray([
        {
          id: 'add',
          label: `Add edge ${s.fromNode}-${s.toNode} (weight ${s.weight}) - different components`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
        {
          id: 'skip',
          label: `Skip - ${s.fromNode} and ${s.toNode} are already connected (cycle!)`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    case CriticalJunctionType.MST_EDGE_SELECT: {
      const s = snapshot.dataStructureState as PrimState
      const candidates = s.candidateEdges ?? []
      const minWeight = candidates.length > 0 ? Math.min(...candidates.map(([, , weight]) => weight)) : null
      return shuffleArray(
        candidates.map(([from, to, weight]) => ({
          id: `${from}-${to}`,
          label: `${from}-${to} (weight ${weight})`,
          misconception: weight === minWeight ? null : MisconceptionCategory.COMPARISON_DIRECTION,
        })),
      )
    }

    case CriticalJunctionType.CYCLE_FOUND: {
      const s = snapshot.dataStructureState as CycleDetectionState
      const target = s.cycleEdge?.[1] ?? ''
      return shuffleArray([
        {
          id: 'cycle',
          label: `Yes - ${target} is GRAY (an ancestor on the current path) - this is a back-edge`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
        {
          id: 'no-cycle',
          label: `No - ${target} is not a current ancestor - not a back-edge`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    case CriticalJunctionType.NEW_COMPONENT: {
      const s = snapshot.dataStructureState as ConnectedComponentsState
      const correct = s.totalComponents ?? 1
      const options = Array.from(new Set([correct, Math.max(1, correct - 1), correct + 1]))
      return shuffleArray(
        options.map((n) => ({
          id: String(n),
          label: `${n} component${n === 1 ? '' : 's'}`,
          misconception: n === correct ? null : MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        })),
      )
    }

    case CriticalJunctionType.TOPOLOGICAL_ORDER: {
      const s = snapshot.dataStructureState as GraphAlgorithmState
      const correct = s.currentNode
      if (!correct) return []
      const already = new Set([...(s.topoOrder ?? []), correct])
      const distractorPool = s.nodes.map((n) => n.id).filter((id) => !already.has(id))
      const distractors = shuffleArray(distractorPool).slice(0, 2)
      return shuffleArray([
        { id: correct, label: correct, misconception: null },
        ...distractors.map((d) => ({ id: d, label: d, misconception: MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION })),
      ])
    }

    case CriticalJunctionType.GRID_NEXT_CELL: {
      const s = snapshot.dataStructureState as GridAlgorithmState
      const isAStar = s.algorithmType === 'astar'
      const scored = s.frontierCells.map(([r, c]) => {
        const cell = s.grid[r]?.[c]
        const g = cell?.gScore ?? 0
        const h = cell?.hScore ?? 0
        return { r, c, f: isAStar ? g + h : g }
      })
      scored.sort((a, b) => a.f - b.f)
      const shown = scored.slice(0, 3)
      const bestF = shown[0]?.f
      return shuffleArray(
        shown.map(({ r, c, f }) => ({
          id: `${r},${c}`,
          label: isAStar ? `(${r}, ${c}) - f(n) = ${f}` : `(${r}, ${c}) - g(n) = ${f}`,
          misconception: f === bestF ? null : MisconceptionCategory.COMPARISON_DIRECTION,
        })),
      )
    }

    // Foundations - array operations
    case CriticalJunctionType.INDEX_ACCESS: {
      const s = snapshot.dataStructureState as { array: number[]; targetIndex: number }
      const candidates = [s.targetIndex, s.targetIndex - 1, s.targetIndex + 1, s.targetIndex - 2].filter(
        (i, idx, arr) => i >= 0 && i < s.array.length && arr.indexOf(i) === idx,
      )
      return shuffleArray(
        candidates.slice(0, 4).map((i) => ({
          id: `idx-${i}`,
          label: `${s.array[i]}`,
          misconception: i === s.targetIndex ? null : MisconceptionCategory.OFF_BY_ONE,
        })),
      )
    }

    case CriticalJunctionType.INSERT_POSITION: {
      const s = snapshot.dataStructureState as { array: number[]; targetIndex: number }
      const pos = s.targetIndex
      const correctIdx = pos + 2
      const candidates = Array.from(new Set([correctIdx, pos - 1, pos, pos + 1])).filter(
        (i) => i >= 0 && i < s.array.length,
      )
      return shuffleArray(
        candidates.map((i) => ({
          id: `idx-${i}`,
          label: `${s.array[i]}`,
          misconception: i === correctIdx ? null : MisconceptionCategory.OFF_BY_ONE,
        })),
      )
    }

    case CriticalJunctionType.DELETE_SHIFT: {
      const s = snapshot.dataStructureState as { array: number[]; targetIndex: number; operationValue: number | null }
      const pos = s.targetIndex
      const options: TileOption[] = []
      options.push(
        pos < s.array.length
          ? { id: `idx-${pos}`, label: `${s.array[pos]}`, misconception: null }
          : { id: 'end-of-array', label: 'Nothing - the array is now shorter', misconception: null },
      )
      if (s.operationValue !== null)
        options.push({
          id: 'deleted-value',
          label: `${s.operationValue} (the deleted value)`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        })
      if (pos + 1 < s.array.length)
        options.push({ id: `idx-${pos + 1}`, label: `${s.array[pos + 1]}`, misconception: MisconceptionCategory.OFF_BY_ONE })
      if (pos - 1 >= 0)
        options.push({ id: `idx-${pos - 1}`, label: `${s.array[pos - 1]}`, misconception: MisconceptionCategory.OFF_BY_ONE })
      return shuffleArray(options)
    }

    // Foundations - linked lists (singly/doubly/circular all share this state shape)
    case CriticalJunctionType.NULL_CHECK: {
      const s = snapshot.dataStructureState as {
        nodes: Array<{ id: string; value: number | string; next: string | null }>
        currentId: string | null
        operation: string
      }
      if (s.operation === 'traverse') {
        return shuffleArray([
          { id: 'when-null', label: 'When next is null', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'when-head-again', label: 'When we reach the head again', misconception: null },
          { id: 'when-n-visited', label: 'When we visit n nodes', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
          {
            id: 'when-value-match',
            label: 'When value equals head value',
            misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
          },
        ])
      }
      const current = s.nodes.find((n) => n.id === s.currentId)
      if (current) {
        return shuffleArray([
          { id: 'yes-last', label: 'Yes - next is null', misconception: MisconceptionCategory.POINTER_CONFUSION },
          {
            id: 'no-more',
            label: 'No - there is another node after this',
            misconception: MisconceptionCategory.POINTER_CONFUSION,
          },
        ])
      }
      return shuffleArray([
        { id: 'null', label: 'null', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'current-head', label: 'the current head', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'tail', label: 'the tail', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'itself', label: 'the new node itself', misconception: MisconceptionCategory.POINTER_CONFUSION },
      ])
    }

    case CriticalJunctionType.INSERT_BETWEEN: {
      const s = snapshot.dataStructureState as {
        nodes: Array<{ id: string; value: number | string; next: string | null; prev?: string | null }>
        currentId: string | null
      }
      const isDLL = s.nodes.some((n) => n.prev !== undefined)
      if (isDLL) {
        return shuffleArray([
          {
            id: 'next-prev-only',
            label: 'new.next = B and new.prev = A only',
            misconception: MisconceptionCategory.POINTER_CONFUSION,
          },
          { id: 'all-four', label: 'new.next = B, new.prev = A, B.prev = new, A.next = new', misconception: null },
          { id: 'a-b-only', label: 'A.next = new and B.prev = new only', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'reversed', label: 'new.next = A and new.prev = B', misconception: MisconceptionCategory.POINTER_CONFUSION },
        ])
      }
      return shuffleArray([
        { id: 'new-then-prev', label: 'New node.next = B, then A.next = new node', misconception: null },
        { id: 'prev-only', label: 'A.next = new node only', misconception: MisconceptionCategory.POINTER_CONFUSION },
        {
          id: 'wrong-order',
          label: 'B.next = new node, then A.next = new node',
          misconception: MisconceptionCategory.ORDER_OF_OPERATIONS,
        },
        { id: 'swapped', label: 'New node.next = A, then B.next = new node', misconception: MisconceptionCategory.POINTER_CONFUSION },
      ])
    }

    case CriticalJunctionType.DELETE_RELINK: {
      const s = snapshot.dataStructureState as {
        nodes: Array<{ id: string; value: number | string; next: string | null; prev?: string | null }>
      }
      const isDLL = s.nodes.some((n) => n.prev !== undefined)
      if (isDLL) {
        return shuffleArray([
          { id: 'one', label: '1', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'two', label: '2', misconception: null },
          { id: 'three', label: '3', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'four', label: '4', misconception: MisconceptionCategory.POINTER_CONFUSION },
        ])
      }
      return shuffleArray([
        { id: 'prev-next-eq-x-next', label: 'prev.next = X.next', misconception: null },
        { id: 'prev-next-null', label: 'prev.next = null', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'x-next-eq-prev', label: 'X.next = prev', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'x-null', label: 'X = null', misconception: MisconceptionCategory.POINTER_CONFUSION },
      ])
    }

    case CriticalJunctionType.POINTER_FOLLOW: {
      const s = snapshot.dataStructureState as {
        nodes: Array<{ id: string; value: number | string; next: string | null; prev?: string | null }>
        currentId: string | null
        activePointer: 'next' | 'prev' | null
        operation: string
      }
      const current = s.nodes.find((n) => n.id === s.currentId)
      if (!current) return []
      // Reverse: predicting where THIS node's own pointer should end up
      // (not which node comes next), so the options are relationship
      // descriptions rather than neighbouring node values.
      if (s.operation === 'reverse') {
        return shuffleArray([
          { id: 'the-previous-node', label: 'the previous node', misconception: null },
          { id: 'the-next-node', label: 'the next node', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'null', label: 'null', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'the-head', label: 'the head', misconception: MisconceptionCategory.POINTER_CONFUSION },
        ])
      }
      const targetId = s.activePointer === 'prev' ? current.prev : current.next
      const others = s.nodes.filter((n) => n.id !== current.id).slice(0, 3)
      const options: TileOption[] = [
        {
          id: targetId ?? 'null',
          label: targetId ? `${s.nodes.find((n) => n.id === targetId)?.value}` : 'null',
          misconception: null,
        },
      ]
      for (const n of others) {
        if (n.id !== targetId) options.push({ id: n.id, label: `${n.value}`, misconception: MisconceptionCategory.POINTER_CONFUSION })
      }
      return shuffleArray(options.slice(0, 4))
    }

    case CriticalJunctionType.TRAVERSE_DIRECTION: {
      const s = snapshot.dataStructureState as {
        nodes: Array<{ id: string; value: number | string; next: string | null; prev?: string | null }>
        currentId: string | null
        activePointer: 'next' | 'prev' | null
        operation: string
      }
      const current = s.nodes.find((n) => n.id === s.currentId)
      if (!current) return []
      if (s.operation === 'reverse') {
        return shuffleArray([
          { id: 'the-previous-node', label: 'the previous node', misconception: null },
          { id: 'the-next-node', label: 'the next node', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'null', label: 'null', misconception: MisconceptionCategory.POINTER_CONFUSION },
          { id: 'the-head', label: 'the head', misconception: MisconceptionCategory.POINTER_CONFUSION },
        ])
      }
      const targetId = s.activePointer === 'prev' ? current.prev : current.next
      const others = s.nodes.filter((n) => n.id !== current.id).slice(0, 3)
      const options: TileOption[] = [
        {
          id: targetId ?? 'null',
          label: targetId ? `${s.nodes.find((n) => n.id === targetId)?.value}` : 'null',
          misconception: null,
        },
      ]
      for (const n of others) {
        if (n.id !== targetId) options.push({ id: n.id, label: `${n.value}`, misconception: MisconceptionCategory.POINTER_CONFUSION })
      }
      return shuffleArray(options.slice(0, 4))
    }

    case CriticalJunctionType.WRAP_CHECK:
      return shuffleArray([
        { id: 'null', label: 'null', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'the-head-node', label: 'the head node', misconception: null },
        { id: 'itself', label: 'itself', misconception: MisconceptionCategory.POINTER_CONFUSION },
        { id: 'the-tail', label: 'the tail', misconception: MisconceptionCategory.POINTER_CONFUSION },
      ])

    // Foundations - stack
    case CriticalJunctionType.STACK_PUSH_RESULT: {
      const s = snapshot.dataStructureState as { items: Array<{ value: number | string }>; lastOperationValue: number | string | null }
      const pushed = s.lastOperationValue
      const prevTop = s.items.length >= 2 ? s.items[s.items.length - 2].value : null
      const options: TileOption[] = [{ id: 'pushed-value', label: `${pushed}`, misconception: null }]
      if (prevTop !== null)
        options.push({ id: 'prev-top', label: `${prevTop}`, misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION })
      if (s.items.length >= 3)
        options.push({
          id: 'middle-value',
          label: `${s.items[0].value}`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        })
      options.push({
        id: 'random-value',
        label: `${Number(pushed) + 100}`,
        misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
      })
      return shuffleArray(options)
    }

    case CriticalJunctionType.STACK_POP_RESULT: {
      const s = snapshot.dataStructureState as { items: Array<{ value: number | string }>; lastOperationValue: number | string | null }
      const popped = s.lastOperationValue
      const options: TileOption[] = [{ id: 'top-value', label: `${popped}`, misconception: null }]
      if (s.items.length >= 1)
        options.push({
          id: 'second-value',
          label: `${s.items[s.items.length - 1].value}`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        })
      options.push({
        id: 'random-value',
        label: `${Number(popped) + 50}`,
        misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
      })
      options.push({ id: 'null', label: 'null', misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION })
      return shuffleArray(options)
    }

    case CriticalJunctionType.OVERFLOW_CHECK:
      return shuffleArray([
        { id: 'yes-succeeds', label: 'Yes - push succeeds', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: 'no-overflow', label: 'No - stack overflow', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
      ])

    case CriticalJunctionType.UNDERFLOW_CHECK:
      return shuffleArray([
        { id: 'zero', label: '0', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: 'null', label: 'null', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: 'error-underflow', label: 'Error - stack underflow', misconception: null },
        { id: 'neg-one', label: '-1', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
      ])

    // Foundations - queue
    case CriticalJunctionType.QUEUE_REAR: {
      const s = snapshot.dataStructureState as { rearIndex: number; frontIndex: number; capacity: number }
      const options = Array.from(
        new Set([s.rearIndex, s.rearIndex - 1, s.frontIndex, s.capacity - 1].filter((i) => i >= 0)),
      )
      return shuffleArray(
        options.map((i) => ({
          id: `idx-${i}`,
          label: `${i}`,
          misconception: i === s.rearIndex ? null : MisconceptionCategory.OFF_BY_ONE,
        })),
      )
    }

    case CriticalJunctionType.QUEUE_FRONT: {
      const s = snapshot.dataStructureState as { items: Array<{ value: number | string }>; lastOperationValue: number | string | null }
      const options: TileOption[] = [{ id: 'front-value', label: `${s.lastOperationValue}`, misconception: null }]
      if (s.items.length >= 1)
        options.push({
          id: 'next-value',
          label: `${s.items[0].value}`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        })
      options.push({
        id: 'random-value',
        label: `${Number(s.lastOperationValue) + 50}`,
        misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
      })
      options.push({ id: 'undefined', label: 'undefined', misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION })
      return shuffleArray(options)
    }

    case CriticalJunctionType.CIRCULAR_WRAP: {
      const s = snapshot.dataStructureState as { capacity: number }
      return shuffleArray([
        { id: 'idx-0', label: '0', misconception: null },
        { id: `idx-${s.capacity}`, label: `${s.capacity}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: `idx-${s.capacity + 1}`, label: `${s.capacity + 1}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        {
          id: `idx-${s.capacity - 1}`,
          label: `${s.capacity - 1} (same index)`,
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
      ])
    }

    case CriticalJunctionType.DEQUE_END:
      return shuffleArray([
        { id: 'front', label: 'Front (index 0)', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
        { id: 'back', label: 'Back (last index)', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
      ])

    case CriticalJunctionType.LOAD_FACTOR: {
      const s = snapshot.dataStructureState as {
        frontIndex?: number
        capacity: number
        size?: number
      }
      if (typeof s.frontIndex === 'number') {
        // Linear queue: wasted-space question.
        const wasted = s.frontIndex
        return shuffleArray([
          { id: `wasted-${wasted}`, label: `${wasted}`, misconception: null },
          { id: 'wasted-0', label: '0', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
          { id: `wasted-half`, label: `${Math.floor(s.capacity / 2)}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
          { id: `wasted-full`, label: `${s.capacity}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        ])
      }
      return shuffleArray([
        { id: 'yes-too-high', label: 'Yes - load factor too high', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: 'no-acceptable', label: 'No - still acceptable', misconception: MisconceptionCategory.BOUNDARY_CONDITION },
      ])
    }

    // Foundations - hash table
    case CriticalJunctionType.HASH_BUCKET: {
      const s = snapshot.dataStructureState as { hashResult: number | null; capacity: number }
      const correct = s.hashResult ?? 0
      const options = Array.from(
        new Set([correct, (correct + 1) % s.capacity, (correct - 1 + s.capacity) % s.capacity, (correct + 2) % s.capacity]),
      )
      return shuffleArray(
        options.map((i) => ({ id: `bucket-${i}`, label: `${i}`, misconception: i === correct ? null : MisconceptionCategory.OFF_BY_ONE })),
      )
    }

    case CriticalJunctionType.COLLISION_RESOLVE:
      return shuffleArray([
        {
          id: 'front-of-chain',
          label: 'At the front of the chain',
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
        { id: 'back-of-chain', label: 'At the back of the chain', misconception: null },
        { id: 'new-bucket', label: 'In a new bucket', misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION },
        { id: 'insert-fails', label: 'The insert fails', misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION },
      ])

    case CriticalJunctionType.PROBE_NEXT:
      return shuffleArray([
        { id: 'i-plus-1-mod', label: '(i + 1) % capacity', misconception: null },
        { id: 'i-plus-2-mod', label: '(i + 2) % capacity', misconception: MisconceptionCategory.OFF_BY_ONE },
        { id: 'i-minus-1', label: 'i - 1', misconception: MisconceptionCategory.OFF_BY_ONE },
        { id: 'i-times-2-mod', label: 'i * 2 % capacity', misconception: MisconceptionCategory.OFF_BY_ONE },
      ])

    // Foundations - advanced search
    case CriticalJunctionType.JUMP_SIZE: {
      const s = snapshot.dataStructureState as { array: number[] }
      const n = s.array.length
      const correct = Math.max(1, Math.round(Math.sqrt(n)))
      return shuffleArray([
        { id: `size-${correct}`, label: `${correct}`, misconception: null },
        { id: `size-half`, label: `${Math.floor(n / 2)}`, misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
        { id: `size-quarter`, label: `${Math.floor(n / 4)}`, misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
        { id: 'size-1', label: '1', misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
      ])
    }

    case CriticalJunctionType.PROBE_POSITION: {
      const s = snapshot.dataStructureState as { probedIndex: number | null; low: number; high: number }
      const correct = s.probedIndex ?? s.low
      const mid = Math.floor((s.low + s.high) / 2)
      const options = Array.from(new Set([correct, mid, s.low + 1, s.high - 1].filter((i) => i >= s.low && i <= s.high)))
      return shuffleArray(
        options.map((i) => ({ id: `idx-${i}`, label: `${i}`, misconception: i === correct ? null : MisconceptionCategory.OFF_BY_ONE })),
      )
    }

    case CriticalJunctionType.RANGE_DOUBLE:
      return shuffleArray([
        {
          id: 'yes-too-small',
          label: 'Yes - the value is smaller than the target, range is too small',
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
        {
          id: 'no-large-enough',
          label: 'No - the value is at least the target, binary search here',
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
      ])

    // Foundations - recursion
    case CriticalJunctionType.BASE_CASE: {
      const s = snapshot.dataStructureState as { baseCase: number }
      // factorial(0) = 1; fib(1) = 1 - both engines' base cases return 1.
      return shuffleArray([
        { id: 'zero', label: '0', misconception: MisconceptionCategory.BASE_CASE_OMISSION },
        { id: 'one', label: '1', misconception: null },
        {
          id: s.baseCase === 1 ? 'two' : 'undefined-alt',
          label: s.baseCase === 1 ? '2' : 'undefined',
          misconception: MisconceptionCategory.BASE_CASE_OMISSION,
        },
        { id: 'undefined', label: 'undefined', misconception: MisconceptionCategory.BASE_CASE_OMISSION },
      ])
    }

    case CriticalJunctionType.RETURN_VALUE: {
      // factorialEngine's RETURN_VALUE description always reads "factorial({n})
      // called factorial({n-1}) which returned {prev}." - parsed instead of
      // re-deriving from frames, since the frame that called n-1 has already
      // been overwritten with n's own (not-yet-known) return value by now.
      const n = Number(snapshot.description.match(/factorial\((\d+)\)/)?.[1])
      const prev = Number(snapshot.description.match(/returned (\d+)/)?.[1])
      if (!Number.isFinite(n) || !Number.isFinite(prev)) return []
      return shuffleArray([
        { id: `mult-${n * prev}`, label: `${n * prev}`, misconception: null },
        { id: `add-${n + prev}`, label: `${n + prev}`, misconception: MisconceptionCategory.ORDER_OF_OPERATIONS },
        { id: `mult-minus-${n * (prev - 1)}`, label: `${n * (prev - 1)}`, misconception: MisconceptionCategory.OFF_BY_ONE },
        { id: `prev-${prev}`, label: `${prev}`, misconception: MisconceptionCategory.ORDER_OF_OPERATIONS },
      ])
    }

    case CriticalJunctionType.RECURSIVE_CALL: {
      const s = snapshot.dataStructureState as { totalCalls?: number; frames: Array<{ argument: number }> }
      if (typeof s.totalCalls === 'number') {
        // Fibonacci: exponential call count question.
        const n = Math.max(...s.frames.map((f) => f.argument), 1)
        const exponential = 2 ** n
        return shuffleArray([
          { id: `exp-${exponential}`, label: `Roughly 2^${n} (exponential)`, misconception: null },
          { id: 'linear', label: `Roughly ${n} (linear)`, misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
          { id: 'quadratic', label: `Roughly ${n * n} (n squared)`, misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
          { id: 'n-only', label: `Exactly ${n}`, misconception: MisconceptionCategory.COMPLEXITY_MISATTRIBUTION },
        ])
      }
      // Factorial: how many more calls remain.
      const remaining = s.frames.length > 0 ? Math.min(...s.frames.map((f) => f.argument)) : 0
      return shuffleArray([
        { id: `remaining-${remaining}`, label: `${remaining}`, misconception: null },
        {
          id: `remaining-minus-${Math.max(0, remaining - 1)}`,
          label: `${Math.max(0, remaining - 1)}`,
          misconception: MisconceptionCategory.OFF_BY_ONE,
        },
        {
          id: `remaining-plus-${remaining + 1}`,
          label: `${remaining + 1}`,
          misconception: MisconceptionCategory.OFF_BY_ONE,
        },
        { id: 'remaining-0', label: '0', misconception: MisconceptionCategory.OFF_BY_ONE },
      ])
    }

    // Foundations - two pointer / sliding window
    case CriticalJunctionType.POINTER_MOVE: {
      const s = snapshot.dataStructureState as {
        array: (number | string)[]
        target: number | null
        leftPointerIndex: number
        rightPointerIndex: number
      }
      if (s.target !== null) {
        return shuffleArray([
          { id: 'move-left', label: 'Move L right - sum is too small', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
          { id: 'move-right', label: 'Move R left - sum is too large', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
          { id: 'found', label: 'Both pointers found the pair', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
          { id: 'no-solution', label: 'Neither - no solution', misconception: MisconceptionCategory.PREMATURE_TERMINATION },
        ])
      }
      return shuffleArray([
        { id: 'match-inward', label: 'Yes - move both pointers inward', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
        { id: 'no-match', label: 'No - not a palindrome', misconception: MisconceptionCategory.COMPARISON_DIRECTION },
      ])
    }

    case CriticalJunctionType.WINDOW_SUM: {
      const s = snapshot.dataStructureState as { array: number[]; windowStart: number; windowEnd: number; windowSum: number }
      const correct = s.windowSum
      return shuffleArray([
        { id: `sum-${correct}`, label: `${correct}`, misconception: null },
        {
          id: `sum-plus`,
          label: `${correct + (s.array[s.windowEnd + 1] ?? 1)}`,
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
        {
          id: `sum-minus`,
          label: `${correct - (s.array[s.windowStart] ?? 1)}`,
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
        { id: `sum-random`, label: `${correct + 7}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
      ])
    }

    case CriticalJunctionType.WINDOW_EXPAND: {
      const s = snapshot.dataStructureState as {
        array: number[]
        windowStart: number
        windowEnd: number
        windowSum: number
        targetSum: number | null
      }
      if (s.targetSum !== null) {
        return shuffleArray([
          {
            id: 'expand',
            label: 'Expand - sum < target, add right element',
            misconception: MisconceptionCategory.BOUNDARY_CONDITION,
          },
          {
            id: 'shrink',
            label: 'Shrink - sum >= target, try to reduce window size',
            misconception: MisconceptionCategory.BOUNDARY_CONDITION,
          },
          { id: 'stop', label: 'Stop - found minimum window', misconception: MisconceptionCategory.PREMATURE_TERMINATION },
        ])
      }
      // Fixed window: incremental new-sum question. This snapshot still
      // holds the OLD window bounds (the slide happens right after), so
      // the removed value is at windowStart and the added one is the
      // slot just past windowEnd.
      const leftVal = s.array[s.windowStart]
      const rightVal = s.array[s.windowEnd + 1]
      const newSum = s.windowSum - leftVal + rightVal
      return shuffleArray([
        { id: `sum-${newSum}`, label: `${newSum}`, misconception: null },
        { id: 'sum-forgot-subtract', label: `${s.windowSum + rightVal}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        { id: 'sum-forgot-add', label: `${s.windowSum - leftVal}`, misconception: MisconceptionCategory.BOUNDARY_CONDITION },
        {
          id: 'sum-recompute-wrong',
          label: `${s.windowSum + rightVal - leftVal + 1}`,
          misconception: MisconceptionCategory.BOUNDARY_CONDITION,
        },
      ])
    }

    // Shell Sort
    case CriticalJunctionType.GAP_COMPARISON: {
      const s = snapshot.dataStructureState as { array: number[]; keyIndex: number }
      const keyVal = s.array[s.keyIndex]
      return shuffleArray([
        { id: 'shift', label: `${keyVal} is smaller - shift it left`, misconception: MisconceptionCategory.ORDER_OF_OPERATIONS },
        {
          id: 'no-shift',
          label: `${keyVal} is not smaller - leave it in place`,
          misconception: MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION,
        },
      ])
    }

    // Heap Sort
    case CriticalJunctionType.HEAP_COMPARE: {
      const s = snapshot.dataStructureState as { array: number[] }
      const [parent, child] = snapshot.activeIndices
      return shuffleArray([
        {
          id: 'sift',
          label: `Sift down ${s.array[parent]} - child ${s.array[child]} is larger`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
        {
          id: 'stay',
          label: `Stay - ${s.array[parent]} is already at least as large`,
          misconception: MisconceptionCategory.INVARIANT_MISAPPLICATION,
        },
      ])
    }

    case CriticalJunctionType.HEAP_EXTRACT: {
      const s = snapshot.dataStructureState as { array: number[] }
      return [{ id: 'extract', label: `Extract ${s.array[0]} - it's the current maximum`, misconception: null }]
    }

    // Counting Sort
    case CriticalJunctionType.COUNT_INCREMENT: {
      const s = snapshot.dataStructureState as { input: number[]; currentInputIndex: number }
      const val = s.input[s.currentInputIndex]
      const distractors = Array.from(new Set([val + 1, Math.max(0, val - 1)])).filter((d) => d !== val)
      return shuffleArray([
        { id: String(val), label: `Bucket ${val}`, misconception: null },
        ...distractors.slice(0, 2).map((d) => ({ id: String(d), label: `Bucket ${d}`, misconception: MisconceptionCategory.OFF_BY_ONE })),
      ])
    }

    case CriticalJunctionType.PREFIX_ACCUMULATE: {
      const s = snapshot.dataStructureState as { count: number[]; currentCountIndex: number }
      const i = s.currentCountIndex
      const newVal = s.count[i] + s.count[i - 1]
      const distractors = Array.from(new Set([newVal + 1, Math.max(0, newVal - 1)])).filter((d) => d !== newVal)
      return shuffleArray([
        { id: String(newVal), label: String(newVal), misconception: null },
        ...distractors.slice(0, 2).map((d) => ({ id: String(d), label: String(d), misconception: MisconceptionCategory.OFF_BY_ONE })),
      ])
    }

    case CriticalJunctionType.PLACE_ELEMENT: {
      const s = snapshot.dataStructureState as { input: number[]; count: number[]; currentInputIndex: number }
      const val = s.input[s.currentInputIndex]
      const correctIdx = s.count[val] - 1
      const distractors = Array.from(new Set([correctIdx + 1, Math.max(0, correctIdx - 1)])).filter((d) => d !== correctIdx)
      return shuffleArray([
        { id: String(correctIdx), label: `Output index ${correctIdx}`, misconception: null },
        ...distractors
          .slice(0, 2)
          .map((d) => ({ id: String(d), label: `Output index ${d}`, misconception: MisconceptionCategory.OFF_BY_ONE })),
      ])
    }

    // Radix Sort (LSD)
    case CriticalJunctionType.DIGIT_BUCKET: {
      const s = snapshot.dataStructureState as { currentDigit: number }
      const correct = s.currentDigit
      const options = [correct]
      let offset = 1
      while (options.length < 4) {
        const d = (correct + offset) % 10
        if (!options.includes(d)) options.push(d)
        offset++
      }
      return shuffleArray(
        options.map((d) => ({ id: String(d), label: `Bucket ${d}`, misconception: d === correct ? null : MisconceptionCategory.OFF_BY_ONE })),
      )
    }

    default:
      return []
  }
}

/** What the array looks like after correctly resolving a SWAP_DECISION junction - the same rule the engine itself applies. */
function computeExpectedNextState(snapshot: AlgorithmSnapshot): number[] {
  const arr = [...(snapshot.dataStructureState as number[])]
  const [i, j] = snapshot.activeIndices
  if (i === undefined || j === undefined || arr[i] === undefined || arr[j] === undefined) return arr
  if (arr[i] > arr[j]) {
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <motion.svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray="14 42"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

export default function PredictionZone({
  onSubmit,
  onHintRequested,
  onPredictionResult,
  setMistakeAnalysis,
  setMistakeHint,
  setMistakeCounterfactual,
  hint,
  setHint,
  setPredictionResolved,
}: PredictionZoneProps) {
  const mode = useAlgorithmStore((state) => state.mode)
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const addXP = useAlgorithmStore((state) => state.addXP)
  const { play } = useSoundEffects()
  const prefersReducedMotion = useReducedMotion()

  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)
  const [currentTiles, setCurrentTiles] = useState<TileOption[]>([])
  const [submissionState, setSubmissionState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  // True only once the attempt cap is reached or the learner explicitly
  // asks to see the answer - an incorrect submission alone must never
  // reveal it, or the retry that follows has nothing left to attempt.
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  // Only true when the current hint came from a manual H-key / avatar
  // click, never from the proactive hint timer - drives whether
  // HintAvatar's floating canvas bubble is allowed to render at all.
  const [wasRequestedManually, setWasRequestedManually] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [xpAmount, setXpAmount] = useState(0)
  const [xpVisible, setXpVisible] = useState(false)
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0)
  const [stepStartTime, setStepStartTime] = useState(() => Date.now())
  const [codeEvalPraise, setCodeEvalPraise] = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  const attemptCountRef = useRef(0)
  const proactiveHintFiredRef = useRef(false)

  const isVisible =
    (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON) &&
    snapshot !== null &&
    snapshot.isPredictionRequired
  const isHandsOnSwapDecision =
    mode === AlgorithmMode.HANDS_ON &&
    snapshot?.criticalJunctionType !== null &&
    snapshot?.criticalJunctionType !== undefined &&
    HANDS_ON_DRAG_JUNCTIONS.has(snapshot.criticalJunctionType)
  const stepIndex = snapshot?.stepIndex ?? null

  // Tiles (and their shuffled order) are generated once per prediction
  // step and held fixed - regenerating on every render would reshuffle
  // out from under the learner mid-decision.
  useEffect(() => {
    if (snapshot?.isPredictionRequired) {
      setCurrentTiles(getTilesForSnapshot(snapshot, algorithmName))
    }
    setCurrentAnswer(null)
    setSubmissionState('idle')
    setRevealAnswer(false)
    setPredictionResolved(false)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    setHint(null)
    setHintLoading(false)
    setWasRequestedManually(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
    setCodeEvalPraise(null)
    setCodeSubmitting(false)
    attemptCountRef.current = 0
    proactiveHintFiredRef.current = false
    // algorithmName is also a dependency, not just stepIndex: when
    // setAlgorithm() swaps in a brand new snapshotArray on mount, it
    // resets stepIndex to 0 - the SAME value it already was - so if an
    // algorithm's very first snapshot is itself a Critical Junction
    // (e.g. BST's single-value insert), this effect would otherwise
    // never re-fire for the real snapshot and currentTiles would stay
    // stuck at its stale/empty value from before the algorithm loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, algorithmName])

  // Hands-On mode: the drag gesture itself is the submission, so this
  // fires handleSubmit directly rather than just staging currentAnswer.
  // A ref keeps the call bound to the latest handleSubmit closure without
  // needing to re-subscribe the listener on every dependency change.
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    function handleHandsOnAnswer(event: Event) {
      const answer = (
        event as CustomEvent<
          | 'swap'
          | 'no-swap'
          | 'shift'
          | 'stop'
          | 'update'
          | 'keep'
          | 'skip'
          | 'take-left'
          | 'take-right'
          | 'no-shift'
          | 'sift'
          | 'stay'
          | 'extract'
        >
      ).detail
      setCurrentAnswer(answer)
      void handleSubmitRef.current(answer)
    }
    window.addEventListener(HANDS_ON_ANSWER_EVENT, handleHandsOnAnswer)
    return () => window.removeEventListener(HANDS_ON_ANSWER_EVENT, handleHandsOnAnswer)
  }, [])

  useEffect(() => {
    function handleDismiss() {
      setHint(null)
    }
    window.addEventListener(DISMISS_HINT_EVENT, handleDismiss)
    window.addEventListener(ESCAPE_EVENT, handleDismiss)
    return () => {
      window.removeEventListener(DISMISS_HINT_EVENT, handleDismiss)
      window.removeEventListener(ESCAPE_EVENT, handleDismiss)
    }
  }, [setHint])

  useEffect(() => {
    function handleRequestHintEvent() {
      void handleRequestHint(false)
    }
    window.addEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    return () => window.removeEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, hintLoading])

  // HIGH scaffolding only: surface a hint on its own after a stretch of
  // inactivity, rather than waiting for the learner to press H. Fires at
  // most once per step so it doesn't nag after a manual dismissal.
  useEffect(() => {
    if (!isVisible || scaffoldingLevel !== ScaffoldingLevel.HIGH) return
    if (submissionState !== 'idle' || hint !== null || hintLoading) return
    if (proactiveHintFiredRef.current) return

    const timer = setTimeout(() => {
      proactiveHintFiredRef.current = true
      void handleRequestHint(true)
    }, PROACTIVE_HINT_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, scaffoldingLevel, submissionState, hint, hintLoading, stepIndex])

  async function handleRequestHint(proactive: boolean) {
    if (hint !== null || hintLoading || !snapshot) return
    setHintLoading(true)
    setWasRequestedManually(!proactive)
    if (!proactive) {
      setHintsRequestedCount((count) => count + 1)
      onHintRequested?.()
    }

    const request: HintRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      // The engine's own snapshot.description is an audit-trail string that
      // states whether the junction's answer is correct (e.g. "a swap is
      // needed") - sending that to the hint model would leak the answer and
      // gives it a denser string to misparse index/value pairs out of.
      // getPromptForSnapshot is the same answer-safe question already shown
      // to the student.
      currentPredictionPrompt: getPromptForSnapshot(snapshot, algorithmName),
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      errorHistory: [],
      scaffoldingLevel,
    }

    const response = await requestHint(request)
    setHint(response.hint)
    setHintLoading(false)
  }

  // The graduated hint ladder: fires automatically on every wrong attempt
  // below the bottom-out cap, escalating hintIndex each time (0 = Socratic
  // question, 1 = more direct). Unlike handleRequestHint, this always
  // fetches a fresh hint for the new attempt rather than skipping because
  // one is already showing.
  async function requestLadderHint(hintIndex: number) {
    if (!snapshot) return
    setHint(null)
    setHintLoading(true)
    setWasRequestedManually(true)
    setHintsRequestedCount((count) => count + 1)
    onHintRequested?.()

    const request: HintRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentPredictionPrompt: getPromptForSnapshot(snapshot, algorithmName),
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      hintIndex,
      errorHistory: [],
      scaffoldingLevel,
    }

    const response = await requestHint(request)
    setHint(response.hint)
    setHintLoading(false)
  }

  function handleTryAgain() {
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  function handleShowAnswer() {
    setRevealAnswer(true)
    setPredictionResolved(true)
  }

  function handleContinueAfterReveal() {
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
    stepForward()
  }

  async function handleSubmit(explicitAnswer?: string) {
    const answer = explicitAnswer ?? currentAnswer
    if (answer === null || isSubmitting || !snapshot) return
    onSubmit(answer)
    setIsSubmitting(true)

    // The engine only ever marks isPredictionRequired true alongside a
    // junction type, so these fallbacks are defensive, not expected.
    const junctionType = snapshot.criticalJunctionType ?? CriticalJunctionType.SWAP_DECISION
    const junctionDifficulty = snapshot.junctionDifficulty ?? JunctionDifficulty.PROCEDURAL

    // The tile the student picked carries its own authored ground-truth
    // misconception (see getTilesForSnapshot above) - free-text/code
    // answers never populate currentTiles, so this is null there and the
    // backend's rule-based classifier takes over instead.
    const selectedTile = currentTiles.find((tile) => tile.id === answer)

    const request: PredictionRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      studentAnswer: answer,
      errorHistory: [],
      scaffoldingLevel,
      sessionId: sessionId ?? 'local-session',
      junctionType,
      junctionDifficulty,
      groundTruthMisconception: selectedTile?.misconception ?? null,
    }

    const response = await submitPrediction(request)
    setIsSubmitting(false)

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)

    // NONE gets one fewer attempt than every other level before bottoming
    // out, per the scaffolding contract - it's already offering the least
    // support, so it also gives up the least room to keep guessing.
    const maxAttempts = scaffoldingLevel === ScaffoldingLevel.NONE ? 2 : 3
    let attempt = attemptCountRef.current
    let isBottomedOut = false
    if (!response.correct) {
      attemptCountRef.current += 1
      attempt = attemptCountRef.current
      isBottomedOut = attempt >= maxAttempts
    }

    onPredictionResult?.({
      correct: response.correct,
      stepIndex: snapshot.stepIndex,
      predictionSubmitted: answer,
      misconceptionCategory: response.correct ? null : response.misconceptionCategory,
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      bottomedOut: isBottomedOut,
    })

    if (response.correct) {
      play('correct')
      setSubmissionState('correct')
      setPredictionResolved(true)
      addXP(response.xpAwarded)
      if (response.xpAwarded > 0) {
        apiFetch('/api/v1/auth/xp', {
          method: 'POST',
          body: JSON.stringify({ amount: response.xpAwarded }),
        }).catch(() => {
          // XP persistence is best-effort; the local session XP already
          // reflects the award regardless of whether this call lands.
        })
      }
      setXpAmount(response.xpAwarded)
      setXpVisible(true)
      play('xp')
      await wait(500)
      stepForward()
      return
    }

    play('incorrect')
    setSubmissionState('incorrect')
    setShakeToken((token) => token + 1)

    if (isBottomedOut) {
      setRevealAnswer(true)
      setPredictionResolved(true)
    }

    if (scaffoldingLevel === ScaffoldingLevel.NONE) {
      // No elaboration from Claude at all, per the NONE scaffolding contract.
      setMistakeAnalysis('Incorrect. Consider the algorithm state and try again.')
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    } else if (scaffoldingLevel === ScaffoldingLevel.LOW) {
      // Brief, one-sentence analysis only; the counterfactual trace is
      // extra elaboration that contradicts "reason through it independently".
      setMistakeAnalysis(firstSentence(response.consequenceExplanation))
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    } else if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(response.socraticHint)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    } else {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(null)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    }

    if (isBottomedOut) {
      // Graduated ladder bottomed out: the answer is now shown (via
      // revealAnswer, above) with the AI's own explanation as the
      // justification - wait long enough to read it, then advance
      // regardless of scaffolding level. Retrying further would have
      // nothing left to discover.
      window.dispatchEvent(new CustomEvent(SHOW_EXPLANATION_LINK_EVENT))
      await wait(BOTTOM_OUT_ADVANCE_DELAY_MS)
      setSubmissionState('idle')
      setCurrentAnswer(null)
      setMistakeAnalysis(null)
      setMistakeHint(null)
      setMistakeCounterfactual(null)
      window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
      stepForward()
      return
    }

    // Still below the cap: escalate to the next rung of the hint ladder
    // automatically (0 = Socratic question, 1 = more direct) rather than
    // waiting for the learner to notice they can press H.
    void requestLadderHint(attempt - 1)

    if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      // Wait for the learner to click "Try again" rather than resetting
      // automatically, so they see what went wrong before retrying.
      return
    }

    await wait(AUTO_RESET_DELAY_MS)
    setSubmissionState('idle')
    setCurrentAnswer(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  // Code Editor Mode's entire submission flow: CodeEditorInput owns the
  // evaluateCode call itself and hands back the full response here, since
  // its response shape (CodeEvalResponse) and XP rule (flat 5 XP) are
  // unrelated to the tile/value flow's submitPrediction contract above.
  async function handleCodeEvalResult(result: CodeEvalResponse, submittedCode: string) {
    if (!snapshot) return

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)
    const junctionType = snapshot.criticalJunctionType ?? CriticalJunctionType.SWAP_DECISION
    const junctionDifficulty = snapshot.junctionDifficulty ?? JunctionDifficulty.PROCEDURAL

    onPredictionResult?.({
      correct: result.isLogicallyCorrect,
      stepIndex: snapshot.stepIndex,
      predictionSubmitted: submittedCode,
      // bug_type uses its own taxonomy (off_by_one/wrong_condition/missing_swap/
      // wrong_index/syntax) that doesn't map cleanly onto MisconceptionCategory,
      // so this deliberately never feeds the AI Challenge misconception signal.
      misconceptionCategory: null,
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      bottomedOut: false,
      isCodeEval: true,
      codeEvalBuggyState:
        !result.isLogicallyCorrect && !result.hasSyntaxError && result.executeVisually && result.resultingState
          ? { resultingState: result.resultingState, activeIndices: snapshot.activeIndices }
          : null,
    })

    if (result.hasSyntaxError) {
      // CodeEditorInput already renders the red border and inline error;
      // nothing else to show, and the canvas must not animate.
      return
    }

    if (result.isLogicallyCorrect) {
      play('correct')
      setSubmissionState('correct')
      setPredictionResolved(true)
      setCodeEvalPraise(result.correctiveHint)
      addXP(CODE_EVAL_XP)
      apiFetch('/api/v1/auth/xp', { method: 'POST', body: JSON.stringify({ amount: CODE_EVAL_XP }) }).catch(() => {
        // XP persistence is best-effort; the local session XP already
        // reflects the award regardless of whether this call lands.
      })
      setXpAmount(CODE_EVAL_XP)
      setXpVisible(true)
      play('xp')

      if (result.executeVisually && result.resultingState) {
        await wait(500)
        const { codeEditorMode, activeChallengeType, setAlgorithm: setAlg, setActiveChallengeType } =
          useAlgorithmStore.getState()
        setAlg('Bubble Sort', bubbleSortEngine(result.resultingState, codeEditorMode))
        // setAlgorithm always clears activeChallengeType for a fresh load;
        // restore it so an in-progress AI Challenge run's completion bonus
        // (Feature 2) still fires when this run eventually finishes.
        if (activeChallengeType) setActiveChallengeType(activeChallengeType)
      }
      return
    }

    play('incorrect')
    setSubmissionState('incorrect')
    setShakeToken((token) => token + 1)
    setMistakeAnalysis(result.errorExplanation ?? 'Your code does not correctly implement this step.')
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    // Direct feedback on a submission the learner just made, not the idle
    // timer, so it's eligible for the floating bubble like a manual hint.
    setWasRequestedManually(true)
    setHint(result.correctiveHint)
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && snapshot && (
          <motion.div
            key="prediction-zone"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
            className={cn(
              // A real flex item (not an absolute overlay) so the canvas
              // area above shrinks to make room instead of this panel
              // covering whatever canvas content sits under it.
              'relative z-20 flex w-full shrink-0 items-start gap-3 rounded-t-lg border-t-2 bg-white px-[14px] py-[10px] shadow-lg dark:bg-dark-surface',
              // Code Editor Mode needs real room for a multi-line textarea,
              // language tabs and its own submit button - the 35% budget
              // that fits a single tile prompt comfortably clips it.
              snapshot.predictionType === PredictionType.CODE_EDITOR ? 'h-[70%]' : 'h-[35%]',
              'transition-colors duration-300',
              submissionState === 'correct' ? 'border-t-success' : 'border-t-[#f59e0b]',
            )}
            role="region"
            aria-label="Predict the next step"
          >
            <div className="flex w-12 shrink-0 items-start justify-center pt-1">
              {scaffoldingLevel !== ScaffoldingLevel.NONE &&
                (scaffoldingLevel === ScaffoldingLevel.LOW ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="opacity-50">
                          <HintAvatar
                            hintAvailable={!codeSubmitting}
                            onRequestHint={() => void handleRequestHint(false)}
                            hint={hint}
                            isLoading={hintLoading}
                            wasRequestedManually={wasRequestedManually}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        You are performing well. Try to reason through this independently.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <HintAvatar
                      hintAvailable={!codeSubmitting}
                      onRequestHint={() => void handleRequestHint(false)}
                      hint={hint}
                      isLoading={hintLoading}
                      wasRequestedManually={wasRequestedManually}
                    />
                  ))}
              </div>

              {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.CODE_EDITOR ? (
                <div className="flex min-w-0 flex-1 flex-col">
                  {codeEvalPraise && (
                    <div className="mb-2 shrink-0 rounded-md border-l-4 border-success bg-success-light p-2.5">
                      <p className="text-xs font-bold text-success">Your code is correct!</p>
                      <p className="mt-0.5 text-[13px] text-text-primary">{codeEvalPraise}</p>
                    </div>
                  )}
                  <CodeEditorInput
                    key={snapshot.stepIndex}
                    prompt={getPromptForSnapshot(snapshot, algorithmName)}
                    stepDescription={snapshot.description}
                    currentArrayState={snapshot.dataStructureState as number[]}
                    activeIndices={snapshot.activeIndices}
                    expectedNextState={computeExpectedNextState(snapshot)}
                    algorithmName={algorithmName}
                    onSubmit={(result, code) => void handleCodeEvalResult(result, code)}
                    onLoadingChange={setCodeSubmitting}
                  />
                </div>
              ) : (
                <>
                  <motion.div
                    key={shakeToken}
                    animate={
                      submissionState === 'incorrect' &&
                      !prefersReducedMotion &&
                      snapshot.predictionType !== PredictionType.TILE_GRID
                        ? { x: [0, -4, 4, -4, 4, -4, 4, 0] }
                        : { x: 0 }
                    }
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    className="flex min-w-0 flex-1 flex-col"
                  >
                    <span className="mb-1 text-[10px] font-semibold tracking-wide text-[#92400e] uppercase">
                      Predict the next step
                    </span>
                    <p className="mb-1.5 text-[13px] font-bold text-text-primary dark:text-dark-text-primary">
                      {getPromptForSnapshot(snapshot, algorithmName)}
                    </p>

                    <div className="flex flex-1 flex-col justify-center">
                      {isHandsOnSwapDecision && (
                        <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                          ↑ {getHandsOnInstructionText(snapshot.criticalJunctionType)}
                        </p>
                      )}
                      {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.VALUE_INPUT && (
                        <ValueInput
                          prompt=""
                          onValueChange={setCurrentAnswer}
                          value={currentAnswer ?? ''}
                          submissionState={submissionState}
                          onSubmit={() => void handleSubmit()}
                        />
                      )}
                      {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.TILE_GRID && (
                        <TileGrid
                          prompt=""
                          options={currentTiles}
                          onSelect={setCurrentAnswer}
                          selectedId={currentAnswer}
                          submissionState={submissionState}
                          snapshot={snapshot}
                          revealAnswer={revealAnswer}
                        />
                      )}
                    </div>
                  </motion.div>

                  <div className="flex shrink-0 items-center justify-center">
                    {submissionState === 'idle' && isHandsOnSwapDecision && (
                      <span className="text-center text-xs text-text-muted dark:text-dark-text-secondary">
                        Drag to answer
                      </span>
                    )}
                    {submissionState === 'idle' && !isHandsOnSwapDecision && (
                      <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={currentAnswer === null || isSubmitting}
                        className="flex items-center justify-center gap-1.5 rounded-md bg-secondary px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSubmitting ? <Spinner /> : 'Submit'}
                      </button>
                    )}
                    {submissionState === 'correct' && (
                      <div className="flex flex-col items-center gap-1 text-success">
                        <CheckIcon />
                        <span className="text-xs font-medium">Correct!</span>
                      </div>
                    )}
                    {submissionState === 'incorrect' && (
                      <div className="flex flex-col items-center gap-1 text-error">
                        <XIcon />
                        {scaffoldingLevel === ScaffoldingLevel.HIGH ? (
                          revealAnswer ? (
                            <button
                              type="button"
                              onClick={handleContinueAfterReveal}
                              className="text-xs font-medium underline underline-offset-2"
                            >
                              Continue
                            </button>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={handleTryAgain}
                                className="text-xs font-medium underline underline-offset-2"
                              >
                                Try again
                              </button>
                              <button
                                type="button"
                                onClick={handleShowAnswer}
                                className="text-[11px] text-text-muted underline underline-offset-2 dark:text-dark-text-secondary"
                              >
                                Show me the answer
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs font-medium">{revealAnswer ? 'Answer revealed' : 'Try again'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      <XPToast amount={xpAmount} visible={xpVisible} onComplete={() => setXpVisible(false)} />
    </>
  )
}
