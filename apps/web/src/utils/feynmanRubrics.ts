/**
 * Display names (as used in useAlgorithmStore's algorithmName / the
 * registry's displayName) for algorithms that have a real, dedicated
 * Feynman rubric on the AI service (see apps/ai/routers/feynman.py's
 * FEYNMAN_RUBRIC). Grading against the generic three-item fallback rubric
 * would produce scores that aren't comparable across topics, so Feynman
 * Mode is restricted to this set rather than silently falling back.
 *
 * Keep in sync with FEYNMAN_RUBRIC's keys in apps/ai/routers/feynman.py -
 * each key there is this name lowercased with spaces/hyphens replaced by
 * underscores and apostrophes stripped.
 */
export const FEYNMAN_RUBRIC_ALGORITHMS: ReadonlySet<string> = new Set([
  'Bubble Sort',
  'Selection Sort',
  'Insertion Sort',
  'Merge Sort',
  'Quick Sort',
  'Linear Search',
  'Binary Search',
  'Breadth-First Search',
  'Depth-First Search',
  'Binary Search Tree',
  // Modules 1 to 3 (Phase 8C).
  'Array Access',
  'Array Insertion',
  'Array Deletion',
  'Singly Linked List',
  'Doubly Linked List',
  'Circular Linked List',
  'Stack',
  'Queue',
  'Circular Queue',
  'Deque',
  'Hash Table (Chaining)',
  'Hash Table (Linear Probing)',
  'Recursion: Factorial',
  'Recursion: Fibonacci',
  'Jump Search',
  'Interpolation Search',
  'Exponential Search',
  'Shell Sort',
  'Heap Sort',
  'Counting Sort',
  'Radix Sort (LSD)',
  // Modules 4 to 6, family by family as each is approved (Phase 8.1).
  'Inorder Traversal',
  'Preorder Traversal',
  'Postorder Traversal',
  'Level Order Traversal',
  'BST Search',
  'BST Delete',
  'Max-Heap Insert',
  'Max-Heap Delete',
  'Min-Heap Insert',
  'Min-Heap Delete',
])

export function hasFeynmanRubric(algorithmName: string): boolean {
  return FEYNMAN_RUBRIC_ALGORITHMS.has(algorithmName)
}
