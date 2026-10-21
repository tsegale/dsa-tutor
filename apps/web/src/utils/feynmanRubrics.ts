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
  'Trie Insert',
  'Trie Search',
  'Trie Delete',
  'AVL Insert',
  'AVL Delete',
  'Red-Black Insert',
  'Red-Black Delete',
  "Dijkstra's Algorithm",
  'Bellman-Ford',
  'Floyd-Warshall',
  "Kruskal's Algorithm",
  "Prim's Algorithm",
  'Cycle Detection',
  'Connected Components',
  'Topological Sort',
  'Grid BFS',
  'Grid DFS',
  'Grid Dijkstra',
  'Grid A*',
  'Two Pointer Technique',
  'Sliding Window (Fixed)',
  'Sliding Window (Variable)',
  // The seven paradigms. Their rubrics ask for the thing each paradigm
  // rests on rather than a description of it: why the prefix table starts
  // with a zero, why a monotonic stack's inner loop is still linear, the
  // case divide and conquer forgets, a greedy rule that fails.
  'Prefix Sums',
  'Monotonic Stack',
  'Divide and Conquer',
  'Greedy Choice',
  'Dynamic Programming (1D)',
  'Dynamic Programming (2D)',
  'Backtracking',
])

export function hasFeynmanRubric(algorithmName: string): boolean {
  return FEYNMAN_RUBRIC_ALGORITHMS.has(algorithmName)
}
