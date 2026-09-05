import { AlgorithmTrack, Difficulty } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from './bubbleSort'
import { linearSearchEngine } from './linearSearch'
import { binarySearchEngine } from './binarySearch'
import { selectionSortEngine } from './selectionSort'
import { insertionSortEngine } from './insertionSort'

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
]

export function getAlgorithmRegistryEntry(algorithmName: string): AlgorithmRegistryEntry | undefined {
  return ALGORITHM_REGISTRY.find((entry) => entry.algorithmName === algorithmName)
}
