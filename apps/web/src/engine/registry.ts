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
import { bstInsertEngine, bstSearchEngine, bstDeleteEngine, type BSTState } from './bst'
import { inorderEngine, preorderEngine, postorderEngine, levelorderEngine } from './treeTraversal'
import { bfsEngine, DEFAULT_BFS_GRAPH } from './bfs'
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
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
  },
  {
    algorithmName: 'bst-search',
    displayName: 'BST Search',
    engineFunction: (input) => bstSearchEngine(rootFromInput(input), 6),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Find a value in a Binary Search Tree by comparing at each node and going left or right.',
    estimatedMinutes: 10,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
    defaultTarget: 6,
  },
  {
    algorithmName: 'bst-delete',
    displayName: 'BST Delete',
    engineFunction: (input) => bstDeleteEngine(rootFromInput(input), 4),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.ADVANCED,
    description: 'Remove a node from a BST, handling three cases: leaf, one child, and two children.',
    estimatedMinutes: 14,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
    defaultTarget: 4,
  },
  {
    algorithmName: 'tree-inorder',
    displayName: 'Inorder Traversal',
    engineFunction: (input) => inorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Left, Root, Right. Produces sorted order on a BST.',
    estimatedMinutes: 8,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
  },
  {
    algorithmName: 'tree-preorder',
    displayName: 'Preorder Traversal',
    engineFunction: (input) => preorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Root, Left, Right. Used to copy or serialise a tree.',
    estimatedMinutes: 8,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
  },
  {
    algorithmName: 'tree-postorder',
    displayName: 'Postorder Traversal',
    engineFunction: (input) => postorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes Left, Right, Root. Used to delete a tree or evaluate expressions.',
    estimatedMinutes: 8,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
  },
  {
    algorithmName: 'tree-level-order',
    displayName: 'Level Order Traversal',
    engineFunction: (input) => levelorderEngine(rootFromInput(input)),
    track: AlgorithmTrack.TREES,
    difficulty: Difficulty.BEGINNER,
    description: 'Visit all nodes level by level using a queue. Also called Breadth-First Traversal.',
    estimatedMinutes: 8,
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
  },
  {
    algorithmName: 'bfs',
    displayName: 'Breadth-First Search',
    // BFS operates on a fixed graph, not the numeric input array - the
    // param exists only to satisfy the shared registry signature.
    engineFunction: () => bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G'),
    track: AlgorithmTrack.GRAPHS,
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Explore a graph level by level using a queue.',
    estimatedMinutes: 10,
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
