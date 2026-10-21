import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { complexityJunctionEnabled } from '@/utils/studyCondition'
import { topMisconceptionOf } from '@/utils/junctionTargeting'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { withCodeMode } from '@/engine/codeMode'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { linearSearchEngine } from '@/engine/linearSearch'
import { binarySearchEngine } from '@/engine/binarySearch'
import { selectionSortEngine } from '@/engine/selectionSort'
import { insertionSortEngine } from '@/engine/insertionSort'
import { mergeSortEngine } from '@/engine/mergeSort'
import { quickSortEngine } from '@/engine/quickSort'
import { shellSortEngine } from '@/engine/shellSort'
import { heapSortEngine } from '@/engine/heapSort'
import { countingSortEngine } from '@/engine/countingSort'
import { radixSortEngine } from '@/engine/radixSort'
import { bstInsertEngine, bstSearchEngine, bstDeleteEngine, type BSTState } from '@/engine/bst'
import { inorderEngine, preorderEngine, postorderEngine, levelorderEngine } from '@/engine/treeTraversal'
import { avlInsertEngine, avlDeleteEngine, type AVLState } from '@/engine/avlTree'
import { rbInsertEngine, rbDeleteEngine, type RBState } from '@/engine/redBlackTree'
import { maxHeapInsertEngine, maxHeapDeleteEngine, minHeapInsertEngine, minHeapDeleteEngine, buildHeapArray } from '@/engine/heap'
import { trieInsertEngine, trieSearchEngine, trieDeleteEngine, DEFAULT_TRIE_WORDS, type TrieState } from '@/engine/trie'
import { bfsNodeGraphEngine } from '@/engine/bfs'
import { dfsNodeGraphEngine } from '@/engine/dfs'
import { dijkstraEngine } from '@/engine/dijkstra'
import { bellmanFordEngine, BELLMAN_FORD_DEFAULT } from '@/engine/bellmanFord'
import { floydWarshallEngine } from '@/engine/floydWarshall'
import { kruskalEngine } from '@/engine/kruskal'
import { primEngine } from '@/engine/prim'
import { cycleDetectionEngine, connectedComponentsEngine, topologicalSortEngine } from '@/engine/graphProperties'
import {
  gridBfsEngine,
  gridDfsEngine,
  gridDijkstraEngine,
  gridAStarEngine,
  buildWalledGrid,
  buildTerrainGrid,
  buildOpenGrid,
  ASTAR_BOARD as A,
  PATHFINDER_BOARD as B,
} from '@/engine/gridAlgorithms'
import { mazeGenerationEngine, mazePrimEngine, mazeKruskalEngine, MAZE_BOARD } from '@/engine/mazeGeneration'
import { SMALL_7, MEDIUM_WEIGHTED, GRID_LIKE, DIRECTED_CYCLE, DIRECTED_ACYCLIC, TWO_COMPONENTS } from '@/engine/graphPresets'
import { arrayAccessEngine, arrayInsertEngine, arrayDeleteEngine } from '@/engine/arrayOperations'
import { sllInsertBackEngine } from '@/engine/singlyLinkedList'
import { dllInsertBackEngine } from '@/engine/doublyLinkedList'
import { cllInsertEngine } from '@/engine/circularLinkedList'
import { stackPushEngine } from '@/engine/stack'
import { queueEnqueueEngine, circularQueueEngine, dequeEngine } from '@/engine/queue'
import { hashInsertChainingEngine, hashInsertLinearProbingEngine } from '@/engine/hashTable'
import { jumpSearchEngine } from '@/engine/jumpSearch'
import { interpolationSearchEngine } from '@/engine/interpolationSearch'
import { exponentialSearchEngine } from '@/engine/exponentialSearch'
import { factorialEngine } from '@/engine/recursionFactorial'
import { fibonacciEngine } from '@/engine/recursionFibonacci'
import { twoSumSortedEngine } from '@/engine/twoPointer'
import { fixedWindowEngine, variableWindowEngine } from '@/engine/slidingWindow'

/**
 * The one place a run is built, for every topic and every caller.
 *
 * There used to be two hand-maintained switches over the same 66 topics:
 * loadAlgorithmEngine in AlgorithmPage (page load, registry defaults) and
 * engineForSlug in LeftPanel (Apply/Random, the learner's values). They
 * drifted, as two copies of a list do: three topics were missing from the
 * LeftPanel one, so pressing Apply on Array Access replaced the canvas
 * with a 34-step Bubble Sort run while the header still said Array Access.
 * The only difference between them was where the input came from, which is
 * now an argument.
 *
 * Code Mode is applied here rather than by any caller, and no caller can
 * pass it: it is read from the store below. Before this, Code Mode was an
 * option on bubbleSortEngine alone, which is why a platform-wide toggle
 * changed nothing on 65 topics.
 */
function buildRun(slug: string, input: number[], target: number): AlgorithmSnapshot[] {

  switch (slug) {
    case 'selection-sort':
      return selectionSortEngine(input)
    case 'insertion-sort':
      return insertionSortEngine(input)
    case 'linear-search':
      return linearSearchEngine(input, target)
    case 'binary-search':
      return binarySearchEngine(input, target, { withComplexityPrediction: complexityJunctionEnabled() })
    case 'merge-sort':
      return mergeSortEngine(input)
    case 'quick-sort':
      return quickSortEngine(input)
    case 'shell-sort':
      return shellSortEngine(input)
    case 'heap-sort':
      return heapSortEngine(input)
    case 'counting-sort':
      return countingSortEngine(input)
    case 'radix-sort':
      return radixSortEngine(input)
    case 'bst':
      return bstInsertEngine(input, { withCompletionCheck: true, withComplexityPrediction: complexityJunctionEnabled() })
    case 'bst-search':
    case 'bst-delete':
    case 'tree-inorder':
    case 'tree-preorder':
    case 'tree-postorder':
    case 'tree-level-order': {
      const root = (bstInsertEngine(input).at(-1)?.dataStructureState as BSTState | undefined)?.root ?? null
      if (slug === 'bst-search') return bstSearchEngine(root, target)
      if (slug === 'bst-delete') return bstDeleteEngine(root, target)
      if (slug === 'tree-preorder') return preorderEngine(root)
      if (slug === 'tree-postorder') return postorderEngine(root)
      if (slug === 'tree-level-order') return levelorderEngine(root)
      return inorderEngine(root)
    }
    case 'avl-insert':
      return avlInsertEngine(input)
    case 'avl-delete': {
      const avlRoot = (avlInsertEngine(input).at(-1)?.dataStructureState as AVLState | undefined)?.root ?? null
      return avlDeleteEngine(avlRoot, target)
    }
    case 'rb-insert':
      return rbInsertEngine(input)
    case 'rb-delete': {
      const rbRoot = (rbInsertEngine(input).at(-1)?.dataStructureState as RBState | undefined)?.root ?? null
      return rbDeleteEngine(rbRoot, target)
    }
    case 'max-heap-insert':
      return maxHeapInsertEngine(input)
    case 'max-heap-delete':
      return maxHeapDeleteEngine(buildHeapArray('max', input))
    case 'min-heap-insert':
      return minHeapInsertEngine(input)
    case 'min-heap-delete':
      return minHeapDeleteEngine(buildHeapArray('min', input))
    case 'trie-insert':
      return trieInsertEngine(DEFAULT_TRIE_WORDS)
    case 'trie-search': {
      const trieRoot = (trieInsertEngine(DEFAULT_TRIE_WORDS).at(-1)?.dataStructureState as TrieState).root
      return trieSearchEngine(trieRoot, 'apple')
    }
    case 'trie-delete': {
      const trieRoot = (trieInsertEngine(DEFAULT_TRIE_WORDS).at(-1)?.dataStructureState as TrieState).root
      return trieDeleteEngine(trieRoot, 'apple')
    }
    case 'bfs':
      return bfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A', 'G')
    case 'dfs':
      return dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    case 'dijkstra':
      return dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H')
    case 'bellman-ford':
      return bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A')
    case 'floyd-warshall':
      return floydWarshallEngine(MEDIUM_WEIGHTED.nodes.slice(0, 5).map((n) => n.id), MEDIUM_WEIGHTED.adjacency)
    case 'kruskal':
      return kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency)
    case 'prim':
      return primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, GRID_LIKE.nodes[0].id)
    case 'cycle-detection':
      return cycleDetectionEngine(DIRECTED_CYCLE.nodes, DIRECTED_CYCLE.adjacency, DIRECTED_CYCLE.directed)
    case 'connected-components':
      return connectedComponentsEngine(TWO_COMPONENTS.nodes, TWO_COMPONENTS.adjacency)
    case 'topological-sort':
      return topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency)
    case 'grid-bfs':
      return gridBfsEngine(buildWalledGrid(B.rows, B.cols), B.start[0], B.start[1], B.end[0], B.end[1])
    case 'grid-dfs':
      return gridDfsEngine(buildWalledGrid(B.rows, B.cols), B.start[0], B.start[1], B.end[0], B.end[1])
    case 'grid-dijkstra':
      return gridDijkstraEngine(buildTerrainGrid(B.rows, B.cols), B.start[0], B.start[1], B.end[0], B.end[1])
    case 'grid-astar':
      return gridAStarEngine(buildOpenGrid(A.rows, A.cols), A.start[0], A.start[1], A.end[0], A.end[1])
    case 'maze-generation':
      return mazeGenerationEngine(MAZE_BOARD.rows, MAZE_BOARD.cols)
    case 'maze-prim':
      return mazePrimEngine(MAZE_BOARD.rows, MAZE_BOARD.cols)
    case 'maze-kruskal':
      return mazeKruskalEngine(MAZE_BOARD.rows, MAZE_BOARD.cols)

    case 'array-access':
      return arrayAccessEngine(input, 2)
    case 'array-insert':
      return arrayInsertEngine(input, 99, 2)
    case 'array-delete':
      return arrayDeleteEngine(input, 1)

    case 'singly-linked-list':
      return sllInsertBackEngine(input)
    case 'doubly-linked-list':
      return dllInsertBackEngine(input)
    case 'circular-linked-list':
      return cllInsertEngine(input)

    case 'stack':
      return stackPushEngine([], input, 6)
    case 'queue':
      return queueEnqueueEngine([], input, 6)
    case 'circular-queue':
      return circularQueueEngine(5, [
        { op: 'enqueue', value: 5 },
        { op: 'enqueue', value: 3 },
        { op: 'dequeue' },
        { op: 'enqueue', value: 8 },
        { op: 'enqueue', value: 1 },
        { op: 'enqueue', value: 9 },
      ])
    case 'deque':
      return dequeEngine(5, [
        { op: 'pushBack', value: 5 },
        { op: 'pushFront', value: 3 },
        { op: 'popFront' },
        { op: 'pushBack', value: 8 },
      ])

    case 'hash-table-chaining':
      return hashInsertChainingEngine(input, 7)
    case 'hash-table-probing':
      return hashInsertLinearProbingEngine(input, 7)

    case 'jump-search':
      return jumpSearchEngine(input, target)
    case 'interpolation-search':
      return interpolationSearchEngine(input, target)
    case 'exponential-search':
      return exponentialSearchEngine(input, target)

    case 'recursion-factorial':
      return factorialEngine(input[0] ?? 6)
    case 'recursion-fibonacci':
      return fibonacciEngine(input[0] ?? 6)

    case 'two-pointer':
      return twoSumSortedEngine(input, target)
    case 'sliding-window-fixed':
      return fixedWindowEngine(input, 3)
    case 'sliding-window-variable':
      return variableWindowEngine(input, target)

    case 'bubble-sort': {
      const { recentMisconceptions } = useAlgorithmStore.getState()
      return bubbleSortEngine(input, {
        withComplexityPrediction: complexityJunctionEnabled(),
        topMisconception: topMisconceptionOf(recentMisconceptions),
      })
    }
    default: {
      // The cases above exist only for engines needing options this switch
      // knows about and the registry's plain engineFunction does not
      // (a search target, a complexity junction, misconception targeting,
      // a fixture that is not an array). Everything else runs from its
      // registry entry, so a topic added there works here without being
      // named twice.
      //
      // This fallback used to be `case 'bubble-sort': default:`, which is
      // how the page's copy of this switch was written: a topic not listed
      // became a Bubble Sort run under its own header. Adding the seven
      // techniques topics reproduced it immediately, and
      // customInputEngine.test.ts caught all seven.
      const entry = getAlgorithmRegistryEntry(slug)
      if (entry) return entry.engineFunction(input)
      // No registry entry at all: not a topic, so there is nothing
      // sensible to run. The page shows its unknown-topic screen for the
      // same condition, so this is only reachable from a direct call.
      return []
    }
  }
}

/** A run of `slug`, on `values` when given and the topic's own default
 * input otherwise. Code Mode is honoured automatically. */
export function runFor(slug: string | undefined, values?: number[]): AlgorithmSnapshot[] {
  const entry = getAlgorithmRegistryEntry(slug ?? '')
  const input = values && values.length > 0 ? values : (entry?.defaultInput ?? [5, 3, 1, 4, 2])
  const target = entry?.defaultTarget ?? 9
  const snapshots = buildRun(slug ?? '', input, target)
  return withCodeMode(snapshots, slug, useAlgorithmStore.getState().codeEditorMode)
}
