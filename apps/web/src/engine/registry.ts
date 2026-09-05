import { AlgorithmTrack, Difficulty } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from './bubbleSort'
import { linearSearchEngine } from './linearSearch'
import { binarySearchEngine } from './binarySearch'
import { selectionSortEngine } from './selectionSort'
import { insertionSortEngine } from './insertionSort'
import { mergeSortEngine } from './mergeSort'
import { quickSortEngine } from './quickSort'
import { bstInsertEngine } from './bst'
import { bfsEngine, DEFAULT_BFS_GRAPH } from './bfs'

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
]

export function getAlgorithmRegistryEntry(algorithmName: string): AlgorithmRegistryEntry | undefined {
  return ALGORITHM_REGISTRY.find((entry) => entry.algorithmName === algorithmName)
}
