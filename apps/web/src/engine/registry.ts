import { AlgorithmTrack, Difficulty } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from './bubbleSort'
import { linearSearchEngine } from './linearSearch'
import { binarySearchEngine } from './binarySearch'
import { selectionSortEngine } from './selectionSort'
import { insertionSortEngine } from './insertionSort'
import { mergeSortEngine } from './mergeSort'
import { quickSortEngine } from './quickSort'
import { shellSortEngine } from './shellSort'
import { heapSortEngine } from './heapSort'
import { countingSortEngine } from './countingSort'
import { radixSortEngine } from './radixSort'
import {
  bstInsertEngine,
  bstSearchEngine,
  bstDeleteEngine,
  BST_DEFAULT_SEED,
  BST_DEFAULT_SEARCH_TARGET,
  BST_DEFAULT_DELETE_TARGET,
  type BSTState,
} from './bst'
import { inorderEngine, preorderEngine, postorderEngine, levelorderEngine } from './treeTraversal'
import { avlInsertEngine, avlDeleteEngine, type AVLState } from './avlTree'
import { rbInsertEngine, rbDeleteEngine, type RBState } from './redBlackTree'
import {
  maxHeapInsertEngine,
  maxHeapDeleteEngine,
  minHeapInsertEngine,
  minHeapDeleteEngine,
  buildHeapArray,
  HEAP_DEFAULT_SEED,
} from './heap'
import { trieInsertEngine, trieSearchEngine, trieDeleteEngine, DEFAULT_TRIE_WORDS, type TrieState } from './trie'
import { bfsNodeGraphEngine } from './bfs'
import { dfsNodeGraphEngine } from './dfs'
import { dijkstraEngine } from './dijkstra'
import { bellmanFordEngine, BELLMAN_FORD_DEFAULT } from './bellmanFord'
import { floydWarshallEngine } from './floydWarshall'
import { kruskalEngine } from './kruskal'
import { primEngine } from './prim'
import { cycleDetectionEngine, connectedComponentsEngine, topologicalSortEngine } from './graphProperties'
import { gridBfsEngine, gridDfsEngine, gridDijkstraEngine, gridAStarEngine, buildEmptyGrid } from './gridAlgorithms'
import { mazeGenerationEngine, mazePrimEngine, mazeKruskalEngine } from './mazeGeneration'
import { SMALL_7, MEDIUM_WEIGHTED, GRID_LIKE, DIRECTED_CYCLE, DIRECTED_ACYCLIC, TWO_COMPONENTS } from './graphPresets'
import { arrayAccessEngine, arrayInsertEngine, arrayDeleteEngine } from './arrayOperations'
import { sllInsertBackEngine } from './singlyLinkedList'
import { dllInsertBackEngine } from './doublyLinkedList'
import { cllInsertEngine } from './circularLinkedList'
import { stackPushEngine } from './stack'
import { queueEnqueueEngine, circularQueueEngine, dequeEngine } from './queue'
import { hashInsertChainingEngine, hashInsertLinearProbingEngine } from './hashTable'
import { jumpSearchEngine } from './jumpSearch'
import { interpolationSearchEngine } from './interpolationSearch'
import { exponentialSearchEngine } from './exponentialSearch'
import { factorialEngine } from './recursionFactorial'
import { fibonacciEngine } from './recursionFibonacci'
import { twoSumSortedEngine } from './twoPointer'
import { fixedWindowEngine, variableWindowEngine } from './slidingWindow'

export interface AlgorithmRegistryEntry {
  algorithmName: string
  displayName: string
  engineFunction: (input: number[]) => AlgorithmSnapshot[]
  track: AlgorithmTrack
  difficulty: Difficulty
  description: string
  estimatedMinutes: number
  defaultInput: number[]
  /** Only meaningful for search algorithms; absent for sorting algorithms. */
  defaultTarget?: number
}

/** bstSearchEngine/bstDeleteEngine and the traversal engines all operate
 * on an existing tree root rather than a value array - build one from
 * `input` via bstInsertEngine's final snapshot, matching AlgorithmPage's
 * and AlgorithmControls' own loading logic. */
function rootFromInput(input: number[]) {
  const lastSnapshot = bstInsertEngine(input).at(-1)
  return (lastSnapshot?.dataStructureState as BSTState | undefined)?.root ?? null
}

/** avlDeleteEngine needs an existing AVL-balanced root, not a plain BST
 * one - built via avlInsertEngine so heights/balance factors are already
 * populated correctly, matching AlgorithmControls' own loading logic. */
function avlRootFromInput(input: number[]) {
  const lastSnapshot = avlInsertEngine(input).at(-1)
  return (lastSnapshot?.dataStructureState as AVLState | undefined)?.root ?? null
}

/** rbDeleteEngine needs an existing Red-Black-valid root, built via
 * rbInsertEngine so colours are already correct - matching
 * AlgorithmControls' own loading logic. */
function rbRootFromInput(input: number[]) {
  const lastSnapshot = rbInsertEngine(input).at(-1)
  return (lastSnapshot?.dataStructureState as RBState | undefined)?.root ?? null
}

/** trieSearchEngine/trieDeleteEngine need an existing trie, not a value
 * array - built from the default word list via trieInsertEngine.
 * trieInsertEngine always pushes at least one snapshot (even for an
 * empty word list) and every snapshot always carries a root node, so
 * this is never actually undefined in practice. */
function trieRootFromWords(words: string[]) {
  const lastSnapshot = trieInsertEngine(words).at(-1)!
  return (lastSnapshot.dataStructureState as TrieState).root
}

export const ALGORITHM_REGISTRY: AlgorithmRegistryEntry[] = [
  {
    algorithmName: 'bubble-sort',
    displayName: 'Bubble Sort',
    engineFunction: (input) => bubbleSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.BEGINNER,
    description: 'Repeatedly compare and swap adjacent elements until the array is sorted.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 1, 4, 2],
  },
  {
    algorithmName: 'selection-sort',
    displayName: 'Selection Sort',
    engineFunction: (input) => selectionSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.BEGINNER,
    description: 'Find the minimum element and place it at the front, repeat for the remainder.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 8, 1, 9, 2],
  },
  {
    algorithmName: 'insertion-sort',
    displayName: 'Insertion Sort',
    engineFunction: (input) => insertionSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.BEGINNER,
    description: 'Build a sorted array one element at a time by inserting each element into its correct position.',
    estimatedMinutes: 8,
    defaultInput: [5, 2, 8, 1, 9],
  },
  {
    algorithmName: 'merge-sort',
    displayName: 'Merge Sort',
    engineFunction: (input) => mergeSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Divide the array in half recursively then merge the sorted halves.',
    estimatedMinutes: 12,
    defaultInput: [5, 2, 8, 1, 9, 3, 7, 4],
  },
  {
    algorithmName: 'quick-sort',
    displayName: 'Quick Sort',
    engineFunction: (input) => quickSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Choose a pivot and partition elements around it, recursively sorting each partition.',
    estimatedMinutes: 12,
    defaultInput: [7, 2, 9, 1, 5, 8, 3],
  },
  {
    algorithmName: 'shell-sort',
    displayName: 'Shell Sort',
    engineFunction: (input) => shellSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Sort by comparing elements at a shrinking gap distance, generalising Insertion Sort.',
    estimatedMinutes: 12,
    defaultInput: [8, 3, 7, 1, 5, 9, 2, 6],
  },
  {
    algorithmName: 'heap-sort',
    displayName: 'Heap Sort',
    engineFunction: (input) => heapSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Build a max-heap then repeatedly extract the maximum element.',
    estimatedMinutes: 14,
    defaultInput: [4, 10, 3, 5, 1, 8, 7, 2],
  },
  {
    algorithmName: 'counting-sort',
    displayName: 'Counting Sort',
    engineFunction: (input) => countingSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Count element frequencies then reconstruct the sorted array in linear time.',
    estimatedMinutes: 12,
    defaultInput: [4, 2, 2, 8, 3, 3, 1],
  },
  {
    algorithmName: 'radix-sort',
    displayName: 'Radix Sort (LSD)',
    engineFunction: (input) => radixSortEngine(input),
    track: AlgorithmTrack.SORTING,
    difficulty: Difficulty.ADVANCED,
    description: 'Sort digit by digit from least to most significant using stable bucket passes.',
    estimatedMinutes: 14,
    defaultInput: [170, 45, 75, 90, 802, 24, 2, 66],
  },
  {
    algorithmName: 'bst',
    displayName: 'Binary Search Tree',
    engineFunction: (input) => bstInsertEngine(input),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'A tree where left children are smaller and right children are larger than the parent.',
    estimatedMinutes: 12,
    defaultInput: BST_DEFAULT_SEED,
  },
  {
    algorithmName: 'bst-search',
    displayName: 'BST Search',
    engineFunction: (input) => bstSearchEngine(rootFromInput(input), BST_DEFAULT_SEARCH_TARGET),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Find a value in a Binary Search Tree by comparing at each node and going left or right.',
    estimatedMinutes: 10,
    defaultInput: BST_DEFAULT_SEED,
    defaultTarget: BST_DEFAULT_SEARCH_TARGET,
  },
  {
    algorithmName: 'bst-delete',
    displayName: 'BST Delete',
    engineFunction: (input) => bstDeleteEngine(rootFromInput(input), BST_DEFAULT_DELETE_TARGET),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Remove a node from a BST, handling three cases: leaf, one child, and two children.',
    estimatedMinutes: 14,
    defaultInput: BST_DEFAULT_SEED,
    defaultTarget: BST_DEFAULT_DELETE_TARGET,
  },
  {
    algorithmName: 'tree-inorder',
    displayName: 'Inorder Traversal',
    engineFunction: (input) => inorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Left, Root, Right. Produces sorted order on a BST.',
    estimatedMinutes: 8,
    defaultInput: BST_DEFAULT_SEED,
  },
  {
    algorithmName: 'tree-preorder',
    displayName: 'Preorder Traversal',
    engineFunction: (input) => preorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Root, Left, Right. Used to copy or serialise a tree.',
    estimatedMinutes: 8,
    defaultInput: BST_DEFAULT_SEED,
  },
  {
    algorithmName: 'tree-postorder',
    displayName: 'Postorder Traversal',
    engineFunction: (input) => postorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Left, Right, Root. Used to delete a tree or evaluate expressions.',
    estimatedMinutes: 8,
    defaultInput: BST_DEFAULT_SEED,
  },
  {
    algorithmName: 'tree-level-order',
    displayName: 'Level Order Traversal',
    engineFunction: (input) => levelorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes level by level using a queue. Also called Breadth-First Traversal.',
    estimatedMinutes: 8,
    defaultInput: BST_DEFAULT_SEED,
  },
  {
    algorithmName: 'avl-insert',
    displayName: 'AVL Insert',
    engineFunction: (input) => avlInsertEngine(input),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Self-balancing BST. After each insert, balance factors are checked and rotations applied.',
    estimatedMinutes: 16,
    defaultInput: [10, 20, 30, 40, 50, 25],
  },
  {
    algorithmName: 'avl-delete',
    displayName: 'AVL Delete',
    engineFunction: (input) => avlDeleteEngine(avlRootFromInput(input), 30),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Delete from an AVL tree and rebalance with LL/RR/LR/RL rotations as needed.',
    estimatedMinutes: 16,
    defaultInput: [10, 20, 30, 40, 50, 25],
    defaultTarget: 30,
  },
  {
    algorithmName: 'rb-insert',
    displayName: 'Red-Black Insert',
    engineFunction: (input) => rbInsertEngine(input),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Self-balancing BST using red/black colouring. Fixes violations via recolouring and rotations.',
    estimatedMinutes: 18,
    defaultInput: [10, 20, 30, 40, 50, 25],
  },
  {
    algorithmName: 'rb-delete',
    displayName: 'Red-Black Delete',
    engineFunction: (input) => rbDeleteEngine(rbRootFromInput(input), 30),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Delete from a Red-Black tree and restore its colour properties via recolouring and rotations.',
    estimatedMinutes: 18,
    defaultInput: [10, 20, 30, 40, 50, 25],
    defaultTarget: 30,
  },
  {
    algorithmName: 'max-heap-insert',
    displayName: 'Max-Heap Insert',
    engineFunction: (input) => maxHeapInsertEngine(input),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Insert into a max-heap by appending then sifting up while a child beats its parent.',
    estimatedMinutes: 10,
    defaultInput: HEAP_DEFAULT_SEED,
  },
  {
    algorithmName: 'max-heap-delete',
    displayName: 'Max-Heap Delete',
    engineFunction: (input) => maxHeapDeleteEngine(buildHeapArray('max', input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Remove the maximum (the root), move the last element up, and sift it down.',
    estimatedMinutes: 10,
    defaultInput: HEAP_DEFAULT_SEED,
  },
  {
    algorithmName: 'min-heap-insert',
    displayName: 'Min-Heap Insert',
    engineFunction: (input) => minHeapInsertEngine(input),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Insert into a min-heap by appending then sifting up while a child beats its parent.',
    estimatedMinutes: 10,
    defaultInput: HEAP_DEFAULT_SEED,
  },
  {
    algorithmName: 'min-heap-delete',
    displayName: 'Min-Heap Delete',
    engineFunction: (input) => minHeapDeleteEngine(buildHeapArray('min', input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Remove the minimum (the root), move the last element up, and sift it down.',
    estimatedMinutes: 10,
    defaultInput: HEAP_DEFAULT_SEED,
  },
  {
    algorithmName: 'trie-insert',
    displayName: 'Trie Insert',
    // Trie words aren't a number array - like bfs's fixed graph, the
    // param exists only to satisfy the shared registry signature.
    engineFunction: () => trieInsertEngine(DEFAULT_TRIE_WORDS),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Insert a word into a Trie, creating a node per new character along the way.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'trie-search',
    displayName: 'Trie Search',
    engineFunction: () => trieSearchEngine(trieRootFromWords(DEFAULT_TRIE_WORDS), 'apple'),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Search a Trie character by character, following child pointers until the word ends.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'trie-delete',
    displayName: 'Trie Delete',
    engineFunction: () => trieDeleteEngine(trieRootFromWords(DEFAULT_TRIE_WORDS), 'apple'),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Delete a word from a Trie, unmarking its ending and pruning now-unneeded nodes.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'bfs',
    displayName: 'Breadth-First Search',
    // Every graph algorithm operates on a fixed preset graph or grid,
    // not the numeric input array - the param exists only to satisfy
    // the shared registry signature, matching bfs's own long-standing
    // convention before this track existed.
    engineFunction: () => bfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A', 'G'),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.BEGINNER,
    description: 'Explore nodes level by level using a queue. Guarantees shortest path in unweighted graphs.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'dfs',
    displayName: 'Depth-First Search',
    engineFunction: () => dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A'),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Explore as deep as possible using a stack. Tracks discovery and finish times.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'dijkstra',
    displayName: 'Dijkstra’s Algorithm',
    engineFunction: () => dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H'),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Shortest path in weighted graphs using a priority queue. Greedy edge relaxation.',
    estimatedMinutes: 12,
    defaultInput: [],
  },
  {
    algorithmName: 'bellman-ford',
    displayName: 'Bellman-Ford',
    engineFunction: () => bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A'),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'Shortest path handling negative weights. Detects negative cycles after V-1 passes.',
    estimatedMinutes: 14,
    defaultInput: [],
  },
  {
    algorithmName: 'floyd-warshall',
    displayName: 'Floyd-Warshall',
    engineFunction: () => floydWarshallEngine(MEDIUM_WEIGHTED.nodes.slice(0, 5).map((n) => n.id), MEDIUM_WEIGHTED.adjacency),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'All-pairs shortest path using dynamic programming. O(V³) matrix-based computation.',
    estimatedMinutes: 14,
    defaultInput: [],
  },
  {
    algorithmName: 'kruskal',
    displayName: 'Kruskal’s Algorithm',
    engineFunction: () => kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'Minimum spanning tree by sorting edges and using Union-Find to avoid cycles.',
    estimatedMinutes: 14,
    defaultInput: [],
  },
  {
    algorithmName: 'prim',
    displayName: 'Prim’s Algorithm',
    engineFunction: () => primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, GRID_LIKE.nodes[0].id),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'Minimum spanning tree growing from a single vertex, always adding the cheapest edge.',
    estimatedMinutes: 14,
    defaultInput: [],
  },
  {
    algorithmName: 'cycle-detection',
    displayName: 'Cycle Detection',
    engineFunction: () => cycleDetectionEngine(DIRECTED_CYCLE.nodes, DIRECTED_CYCLE.adjacency, DIRECTED_CYCLE.directed),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Detect cycles in directed/undirected graphs using DFS colouring (white/gray/black).',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'connected-components',
    displayName: 'Connected Components',
    engineFunction: () => connectedComponentsEngine(TWO_COMPONENTS.nodes, TWO_COMPONENTS.adjacency),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.BEGINNER,
    description: 'Find all connected components in an undirected graph using BFS or DFS.',
    estimatedMinutes: 8,
    defaultInput: [],
  },
  {
    algorithmName: 'topological-sort',
    displayName: 'Topological Sort',
    engineFunction: () => topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'Linear ordering of vertices in a DAG such that every edge goes from earlier to later.',
    estimatedMinutes: 12,
    defaultInput: [],
  },
  {
    algorithmName: 'grid-bfs',
    displayName: 'Grid BFS',
    engineFunction: () => gridBfsEngine(buildEmptyGrid(20, 35), 10, 2, 10, 32),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.BEGINNER,
    description: 'BFS pathfinding on a grid. Finds shortest path. Draw walls and watch the wave spread.',
    estimatedMinutes: 8,
    defaultInput: [],
  },
  {
    algorithmName: 'grid-dfs',
    displayName: 'Grid DFS',
    engineFunction: () => gridDfsEngine(buildEmptyGrid(20, 35), 10, 2, 10, 32),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.BEGINNER,
    description: 'DFS pathfinding on a grid. Not shortest path. Shows how DFS winds through obstacles.',
    estimatedMinutes: 8,
    defaultInput: [],
  },
  {
    algorithmName: 'grid-dijkstra',
    displayName: 'Grid Dijkstra',
    engineFunction: () => gridDijkstraEngine(buildEmptyGrid(20, 35), 10, 2, 10, 32),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Dijkstra on a grid with uniform cost. Bridge between BFS and weighted Dijkstra.',
    estimatedMinutes: 10,
    defaultInput: [],
  },
  {
    algorithmName: 'grid-astar',
    displayName: 'Grid A*',
    engineFunction: () => gridAStarEngine(buildEmptyGrid(20, 35), 10, 2, 10, 32),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.ADVANCED,
    description: 'A* pathfinding with Manhattan heuristic. Explores far fewer cells than Dijkstra.',
    estimatedMinutes: 12,
    defaultInput: [],
  },
  {
    algorithmName: 'maze-generation',
    displayName: 'Maze Generation',
    engineFunction: () => mazeGenerationEngine(20, 35),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.BEGINNER,
    description: 'Recursive backtracking maze generation. Watch the DFS carve perfect mazes.',
    estimatedMinutes: 6,
    defaultInput: [],
  },
  {
    algorithmName: 'maze-prim',
    displayName: 'Maze via Prim’s',
    engineFunction: () => mazePrimEngine(20, 35),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Prim’s algorithm adapted for maze generation. Produces mazes with longer corridors.',
    estimatedMinutes: 6,
    defaultInput: [],
  },
  {
    algorithmName: 'maze-kruskal',
    displayName: 'Maze via Kruskal’s',
    engineFunction: () => mazeKruskalEngine(20, 35),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Kruskal’s algorithm adapted for maze generation. Produces mazes with more texture.',
    estimatedMinutes: 6,
    defaultInput: [],
  },

  // Array operations - grouped as one topic with three sub-modes
  {
    algorithmName: 'array-access',
    displayName: 'Array Access',
    engineFunction: (input) => arrayAccessEngine(input, Math.min(2, Math.max(0, input.length - 1))),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Access any element in O(1) time using its index.',
    estimatedMinutes: 4,
    defaultInput: [10, 20, 30, 40, 50],
  },
  {
    algorithmName: 'array-insert',
    displayName: 'Array Insertion',
    engineFunction: (input) => arrayInsertEngine(input, 99, Math.min(2, input.length)),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Insert an element at any position, shifting others right.',
    estimatedMinutes: 5,
    defaultInput: [10, 20, 30, 40, 50],
  },
  {
    algorithmName: 'array-delete',
    displayName: 'Array Deletion',
    engineFunction: (input) => arrayDeleteEngine(input, Math.min(1, Math.max(0, input.length - 1))),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Delete an element at any position, shifting others left.',
    estimatedMinutes: 5,
    defaultInput: [10, 20, 30, 40, 50],
  },

  // Linked lists
  {
    algorithmName: 'singly-linked-list',
    displayName: 'Singly Linked List',
    engineFunction: (input) => sllInsertBackEngine(input),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Nodes connected by a single forward pointer.',
    estimatedMinutes: 10,
    defaultInput: [3, 7, 1, 9, 4],
  },
  {
    algorithmName: 'doubly-linked-list',
    displayName: 'Doubly Linked List',
    engineFunction: (input) => dllInsertBackEngine(input),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Nodes connected by both forward and backward pointers.',
    estimatedMinutes: 10,
    defaultInput: [3, 7, 1, 9, 4],
  },
  {
    algorithmName: 'circular-linked-list',
    displayName: 'Circular Linked List',
    engineFunction: (input) => cllInsertEngine(input),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'A linked list where the last node points back to the head.',
    estimatedMinutes: 8,
    defaultInput: [3, 7, 1, 9, 4],
  },

  // Stack and Queue
  {
    algorithmName: 'stack',
    displayName: 'Stack',
    engineFunction: () => stackPushEngine([], [5, 3, 8, 1, 9], 6),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Last-in first-out - push and pop from the same end.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 8, 1, 9],
  },
  {
    algorithmName: 'queue',
    displayName: 'Queue',
    engineFunction: () => queueEnqueueEngine([], [5, 3, 8, 1, 9], 6),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'First-in first-out - enqueue at rear, dequeue from front.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 8, 1, 9],
  },
  {
    algorithmName: 'circular-queue',
    displayName: 'Circular Queue',
    engineFunction: () =>
      circularQueueEngine(5, [
        { op: 'enqueue', value: 5 },
        { op: 'enqueue', value: 3 },
        { op: 'dequeue' },
        { op: 'enqueue', value: 8 },
        { op: 'enqueue', value: 1 },
        { op: 'enqueue', value: 9 },
      ]),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'A queue that wraps around to reuse freed space.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 8, 1, 9],
  },
  {
    algorithmName: 'deque',
    displayName: 'Deque',
    engineFunction: () =>
      dequeEngine(5, [
        { op: 'pushBack', value: 5 },
        { op: 'pushFront', value: 3 },
        { op: 'popFront' },
        { op: 'pushBack', value: 8 },
      ]),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Double-ended queue - insert and remove from both ends.',
    estimatedMinutes: 8,
    defaultInput: [5, 3, 8],
  },

  // Hash table
  {
    algorithmName: 'hash-table-chaining',
    displayName: 'Hash Table (Chaining)',
    engineFunction: (input) => hashInsertChainingEngine(input, 7),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Resolve collisions by chaining entries in the same bucket.',
    estimatedMinutes: 12,
    defaultInput: [15, 11, 27, 8, 12, 19],
  },
  {
    algorithmName: 'hash-table-probing',
    displayName: 'Hash Table (Linear Probing)',
    engineFunction: (input) => hashInsertLinearProbingEngine(input, 7),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Resolve collisions by probing for the next empty slot.',
    estimatedMinutes: 12,
    defaultInput: [15, 11, 27, 8, 12],
  },

  // Recursion
  {
    algorithmName: 'recursion-factorial',
    displayName: 'Recursion: Factorial',
    engineFunction: () => factorialEngine(6),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Classic recursion: n! computed by reducing to smaller subproblems.',
    estimatedMinutes: 8,
    defaultInput: [6],
  },
  {
    algorithmName: 'recursion-fibonacci',
    displayName: 'Recursion: Fibonacci',
    engineFunction: () => fibonacciEngine(6),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Naive recursive Fibonacci exposes the overlapping subproblems problem.',
    estimatedMinutes: 10,
    defaultInput: [6],
  },

  // Search algorithms
  {
    algorithmName: 'linear-search',
    displayName: 'Linear Search',
    engineFunction: (input) => linearSearchEngine(input, Math.floor(Math.random() * 20) + 1),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Check each element one by one until the target is found.',
    estimatedMinutes: 4,
    defaultInput: [3, 7, 1, 9, 4, 6],
    defaultTarget: 9,
  },
  {
    algorithmName: 'binary-search',
    displayName: 'Binary Search',
    engineFunction: (input) => binarySearchEngine(input, Math.floor(Math.random() * 20) + 1),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Search a sorted array by repeatedly halving the search space.',
    estimatedMinutes: 6,
    defaultInput: [1, 3, 5, 7, 9, 11, 15, 19],
    defaultTarget: 7,
  },
  {
    algorithmName: 'jump-search',
    displayName: 'Jump Search',
    engineFunction: (input) => jumpSearchEngine(input, Math.floor(Math.random() * 20) + 1),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Jump ahead by √n steps then search linearly within the block.',
    estimatedMinutes: 6,
    defaultInput: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
    defaultTarget: 15,
  },
  {
    algorithmName: 'interpolation-search',
    displayName: 'Interpolation Search',
    engineFunction: (input) => interpolationSearchEngine(input, Math.floor(Math.random() * 20) + 1),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Estimate the probe position using the value distribution.',
    estimatedMinutes: 8,
    defaultInput: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
    defaultTarget: 7,
  },
  {
    algorithmName: 'exponential-search',
    displayName: 'Exponential Search',
    engineFunction: (input) => exponentialSearchEngine(input, Math.floor(Math.random() * 20) + 1),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Double the search bound then apply binary search.',
    estimatedMinutes: 6,
    defaultInput: [1, 2, 4, 8, 16, 32, 64, 128, 256],
    defaultTarget: 64,
  },

  // Two pointer and sliding window
  {
    algorithmName: 'two-pointer',
    displayName: 'Two Pointer Technique',
    engineFunction: (input) => twoSumSortedEngine(input, 14),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Solve array problems in O(n) using two moving pointers.',
    estimatedMinutes: 8,
    defaultInput: [1, 2, 4, 6, 8, 10, 12],
    defaultTarget: 14,
  },
  {
    algorithmName: 'sliding-window-fixed',
    displayName: 'Sliding Window (Fixed)',
    engineFunction: (input) => fixedWindowEngine(input, 3),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.BEGINNER,
    description: 'Maintain a fixed-size window to compute range properties in O(n).',
    estimatedMinutes: 8,
    defaultInput: [2, 1, 5, 1, 3, 2, 4, 1],
  },
  {
    algorithmName: 'sliding-window-variable',
    displayName: 'Sliding Window (Variable)',
    engineFunction: (input) => variableWindowEngine(input, 7),
    track: AlgorithmTrack.FOUNDATIONS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Expand and shrink a window to satisfy a constraint in O(n).',
    estimatedMinutes: 10,
    defaultInput: [2, 3, 1, 2, 4, 3],
    defaultTarget: 7,
  },
]

export function getAlgorithmRegistryEntry(algorithmName: string): AlgorithmRegistryEntry | undefined {
  return ALGORITHM_REGISTRY.find((entry) => entry.algorithmName === algorithmName)
}
