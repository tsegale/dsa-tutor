import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TOPICS = [
  { name: 'bubble-sort', displayName: 'Bubble Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Repeatedly compare and swap adjacent elements until the array is sorted.', estimatedMinutes: 8, isLocked: false, order: 31 },
  { name: 'selection-sort', displayName: 'Selection Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Find the minimum element and place it at the beginning, repeat for remaining elements.', estimatedMinutes: 8, isLocked: false, order: 32 },
  { name: 'insertion-sort', displayName: 'Insertion Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Build a sorted array one element at a time by inserting each into its correct position.', estimatedMinutes: 8, isLocked: false, order: 33 },
  { name: 'merge-sort', displayName: 'Merge Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Divide the array in half recursively then merge the sorted halves.', estimatedMinutes: 12, isLocked: false, order: 35 },
  { name: 'quick-sort', displayName: 'Quick Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Choose a pivot and partition elements around it, then recursively sort each partition.', estimatedMinutes: 12, isLocked: false, order: 36 },
  { name: 'shell-sort', displayName: 'Shell Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Sort by comparing elements at a shrinking gap distance, generalising Insertion Sort.', estimatedMinutes: 12, isLocked: false, order: 34 },
  { name: 'heap-sort', displayName: 'Heap Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Build a max-heap then repeatedly extract the maximum element.', estimatedMinutes: 14, isLocked: false, order: 37 },
  { name: 'counting-sort', displayName: 'Counting Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Count element frequencies then reconstruct the sorted array in linear time.', estimatedMinutes: 12, isLocked: false, order: 38 },
  { name: 'radix-sort', displayName: 'Radix Sort (LSD)', track: 'SORTING', difficulty: 'ADVANCED', description: 'Sort digit by digit from least to most significant using stable bucket passes.', estimatedMinutes: 14, isLocked: false, order: 39 },
  { name: 'bst', displayName: 'Binary Search Tree', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'A tree where left children are smaller and right children are larger than the parent.', estimatedMinutes: 12, isLocked: false, order: 51 },
  { name: 'bst-search', displayName: 'BST Search', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Find a value in a Binary Search Tree by comparing at each node and going left or right.', estimatedMinutes: 10, isLocked: false, order: 52 },
  { name: 'bst-delete', displayName: 'BST Delete', track: 'TREES', difficulty: 'ADVANCED', description: 'Remove a node from a BST, handling three cases: leaf, one child, and two children.', estimatedMinutes: 14, isLocked: false, order: 53 },
  { name: 'tree-inorder', displayName: 'Inorder Traversal', track: 'TREES', difficulty: 'BEGINNER', description: 'Visit all nodes Left, Root, Right. Produces sorted order on a BST.', estimatedMinutes: 8, isLocked: false, order: 54 },
  { name: 'tree-preorder', displayName: 'Preorder Traversal', track: 'TREES', difficulty: 'BEGINNER', description: 'Visit all nodes Root, Left, Right. Used to copy or serialise a tree.', estimatedMinutes: 8, isLocked: false, order: 55 },
  { name: 'tree-postorder', displayName: 'Postorder Traversal', track: 'TREES', difficulty: 'BEGINNER', description: 'Visit all nodes Left, Right, Root. Used to delete a tree or evaluate expressions.', estimatedMinutes: 8, isLocked: false, order: 56 },
  { name: 'tree-level-order', displayName: 'Level Order Traversal', track: 'TREES', difficulty: 'BEGINNER', description: 'Visit all nodes level by level using a queue. Also called Breadth-First Traversal.', estimatedMinutes: 8, isLocked: false, order: 57 },
  { name: 'avl-insert', displayName: 'AVL Insert', track: 'TREES', difficulty: 'ADVANCED', description: 'Self-balancing BST. After each insert, balance factors are checked and rotations applied.', estimatedMinutes: 16, isLocked: false, order: 58 },
  { name: 'avl-delete', displayName: 'AVL Delete', track: 'TREES', difficulty: 'ADVANCED', description: 'Delete from an AVL tree and rebalance with LL/RR/LR/RL rotations as needed.', estimatedMinutes: 16, isLocked: false, order: 59 },
  { name: 'rb-insert', displayName: 'Red-Black Insert', track: 'TREES', difficulty: 'ADVANCED', description: 'Self-balancing BST using red/black colouring. Fixes violations via recolouring and rotations.', estimatedMinutes: 18, isLocked: false, order: 60 },
  { name: 'rb-delete', displayName: 'Red-Black Delete', track: 'TREES', difficulty: 'ADVANCED', description: 'Delete from a Red-Black tree and restore its colour properties via recolouring and rotations.', estimatedMinutes: 18, isLocked: false, order: 61 },
  { name: 'max-heap-insert', displayName: 'Max-Heap Insert', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Insert into a max-heap by appending then sifting up while a child beats its parent.', estimatedMinutes: 10, isLocked: false, order: 62 },
  { name: 'max-heap-delete', displayName: 'Max-Heap Delete', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Remove the maximum (the root), move the last element up, and sift it down.', estimatedMinutes: 10, isLocked: false, order: 63 },
  { name: 'min-heap-insert', displayName: 'Min-Heap Insert', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Insert into a min-heap by appending then sifting up while a child beats its parent.', estimatedMinutes: 10, isLocked: false, order: 64 },
  { name: 'min-heap-delete', displayName: 'Min-Heap Delete', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Remove the minimum (the root), move the last element up, and sift it down.', estimatedMinutes: 10, isLocked: false, order: 65 },
  { name: 'trie-insert', displayName: 'Trie Insert', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Insert a word into a Trie, creating a node per new character along the way.', estimatedMinutes: 10, isLocked: false, order: 66 },
  { name: 'trie-search', displayName: 'Trie Search', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Search a Trie character by character, following child pointers until the word ends.', estimatedMinutes: 10, isLocked: false, order: 67 },
  { name: 'trie-delete', displayName: 'Trie Delete', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'Delete a word from a Trie, unmarking its ending and pruning now-unneeded nodes.', estimatedMinutes: 10, isLocked: false, order: 68 },
  { name: 'bfs', displayName: 'Breadth-First Search', track: 'GRAPHS', difficulty: 'BEGINNER', description: 'Explore nodes level by level using a queue. Guarantees shortest path in unweighted graphs.', estimatedMinutes: 10, isLocked: false, order: 71 },
  { name: 'dfs', displayName: 'Depth-First Search', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Explore as deep as possible using a stack. Tracks discovery and finish times.', estimatedMinutes: 10, isLocked: false, order: 72 },
  { name: 'dijkstra', displayName: 'Dijkstra\'s Algorithm', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Shortest path in weighted graphs using a priority queue. Greedy edge relaxation.', estimatedMinutes: 12, isLocked: false, order: 73 },
  { name: 'bellman-ford', displayName: 'Bellman-Ford', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'Shortest path handling negative weights. Detects negative cycles after V-1 passes.', estimatedMinutes: 14, isLocked: false, order: 74 },
  { name: 'floyd-warshall', displayName: 'Floyd-Warshall', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'All-pairs shortest path using dynamic programming. O(V³) matrix-based computation.', estimatedMinutes: 14, isLocked: false, order: 75 },
  { name: 'kruskal', displayName: 'Kruskal\'s Algorithm', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'Minimum spanning tree by sorting edges and using Union-Find to avoid cycles.', estimatedMinutes: 14, isLocked: false, order: 76 },
  { name: 'prim', displayName: 'Prim\'s Algorithm', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'Minimum spanning tree growing from a single vertex, always adding the cheapest edge.', estimatedMinutes: 14, isLocked: false, order: 77 },
  { name: 'cycle-detection', displayName: 'Cycle Detection', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Detect cycles in directed/undirected graphs using DFS colouring (white/gray/black).', estimatedMinutes: 10, isLocked: false, order: 78 },
  { name: 'connected-components', displayName: 'Connected Components', track: 'GRAPHS', difficulty: 'BEGINNER', description: 'Find all connected components in an undirected graph using BFS or DFS.', estimatedMinutes: 8, isLocked: false, order: 79 },
  { name: 'topological-sort', displayName: 'Topological Sort', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'Linear ordering of vertices in a DAG such that every edge goes from earlier to later.', estimatedMinutes: 12, isLocked: false, order: 80 },
  { name: 'grid-bfs', displayName: 'Grid BFS', track: 'GRAPHS', difficulty: 'BEGINNER', description: 'BFS pathfinding on a grid. Finds shortest path. Draw walls and watch the wave spread.', estimatedMinutes: 8, isLocked: false, order: 81 },
  { name: 'grid-dfs', displayName: 'Grid DFS', track: 'GRAPHS', difficulty: 'BEGINNER', description: 'DFS pathfinding on a grid. Not shortest path. Shows how DFS winds through obstacles.', estimatedMinutes: 8, isLocked: false, order: 82 },
  { name: 'grid-dijkstra', displayName: 'Grid Dijkstra', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Dijkstra on a grid with uniform cost. Bridge between BFS and weighted Dijkstra.', estimatedMinutes: 10, isLocked: false, order: 83 },
  { name: 'grid-astar', displayName: 'Grid A*', track: 'GRAPHS', difficulty: 'ADVANCED', description: 'A* pathfinding with Manhattan heuristic. Explores far fewer cells than Dijkstra.', estimatedMinutes: 12, isLocked: false, order: 84 },
  { name: 'maze-generation', displayName: 'Maze Generation', track: 'GRAPHS', difficulty: 'BEGINNER', description: 'Recursive backtracking maze generation. Watch the DFS carve perfect mazes.', estimatedMinutes: 6, isLocked: false, order: 85 },
  { name: 'maze-prim', displayName: 'Maze via Prim\'s', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Prim\'s algorithm adapted for maze generation. Produces mazes with longer corridors.', estimatedMinutes: 6, isLocked: false, order: 86 },
  { name: 'maze-kruskal', displayName: 'Maze via Kruskal\'s', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Kruskal\'s algorithm adapted for maze generation. Produces mazes with more texture.', estimatedMinutes: 6, isLocked: false, order: 87 },

  // Foundations track additions - array operations, all unlocked.
  // order follows the standard CS teaching progression: primitive array
  // ops -> pointer-based structures -> abstract data types -> hash
  // tables -> recursion -> search algorithms -> algorithmic techniques.
  { name: 'array-access', displayName: 'Array Access', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Access any element in O(1) time using its index.', estimatedMinutes: 4, isLocked: false, order: 1 },
  { name: 'array-insert', displayName: 'Array Insertion', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Insert an element at any position, shifting others right.', estimatedMinutes: 5, isLocked: false, order: 2 },
  { name: 'array-delete', displayName: 'Array Deletion', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Delete an element at any position, shifting others left.', estimatedMinutes: 5, isLocked: false, order: 3 },

  // Linked lists
  { name: 'singly-linked-list', displayName: 'Singly Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Nodes connected by a single forward pointer.', estimatedMinutes: 10, isLocked: false, order: 4 },
  { name: 'doubly-linked-list', displayName: 'Doubly Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Nodes connected by both forward and backward pointers.', estimatedMinutes: 10, isLocked: false, order: 5 },
  { name: 'circular-linked-list', displayName: 'Circular Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'A linked list where the last node points back to the head.', estimatedMinutes: 8, isLocked: false, order: 6 },

  // Stack and Queue
  { name: 'stack', displayName: 'Stack', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Last-in first-out - push and pop from the same end.', estimatedMinutes: 8, isLocked: false, order: 7 },
  { name: 'queue', displayName: 'Queue', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'First-in first-out - enqueue at rear, dequeue from front.', estimatedMinutes: 8, isLocked: false, order: 8 },
  { name: 'circular-queue', displayName: 'Circular Queue', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'A queue that wraps around to reuse freed space.', estimatedMinutes: 8, isLocked: false, order: 9 },
  { name: 'deque', displayName: 'Deque', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Double-ended queue - insert and remove from both ends.', estimatedMinutes: 8, isLocked: false, order: 10 },

  // Hash table
  { name: 'hash-table-chaining', displayName: 'Hash Table (Chaining)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Resolve collisions by chaining entries in the same bucket.', estimatedMinutes: 12, isLocked: false, order: 11 },
  { name: 'hash-table-probing', displayName: 'Hash Table (Linear Probing)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Resolve collisions by probing for the next empty slot.', estimatedMinutes: 12, isLocked: false, order: 12 },

  // Recursion
  { name: 'recursion-factorial', displayName: 'Recursion: Factorial', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Classic recursion: n! computed by reducing to smaller subproblems.', estimatedMinutes: 8, isLocked: false, order: 13 },
  { name: 'recursion-fibonacci', displayName: 'Recursion: Fibonacci', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Naive recursive Fibonacci exposes the overlapping subproblems problem.', estimatedMinutes: 10, isLocked: false, order: 14 },

  // Search algorithms
  { name: 'linear-search', displayName: 'Linear Search', track: 'SEARCHING', difficulty: 'BEGINNER', description: 'Check each element one by one until the target is found.', estimatedMinutes: 4, isLocked: false, order: 1 },
  { name: 'binary-search', displayName: 'Binary Search', track: 'SEARCHING', difficulty: 'BEGINNER', description: 'Search a sorted array by repeatedly halving the search space.', estimatedMinutes: 6, isLocked: false, order: 2 },
  { name: 'jump-search', displayName: 'Jump Search', track: 'SEARCHING', difficulty: 'BEGINNER', description: 'Jump ahead by √n steps then search linearly within the block.', estimatedMinutes: 6, isLocked: false, order: 3 },
  { name: 'interpolation-search', displayName: 'Interpolation Search', track: 'SEARCHING', difficulty: 'INTERMEDIATE', description: 'Estimate the probe position using the value distribution.', estimatedMinutes: 8, isLocked: false, order: 4 },
  { name: 'exponential-search', displayName: 'Exponential Search', track: 'SEARCHING', difficulty: 'INTERMEDIATE', description: 'Double the search bound then apply binary search.', estimatedMinutes: 6, isLocked: false, order: 5 },

  // Two pointer and sliding window
  { name: 'two-pointer', displayName: 'Two Pointer Technique', track: 'TECHNIQUES', difficulty: 'BEGINNER', description: 'Solve array problems in O(n) using two moving pointers.', estimatedMinutes: 8, isLocked: false, order: 1 },
  { name: 'sliding-window-fixed', displayName: 'Sliding Window (Fixed)', track: 'TECHNIQUES', difficulty: 'BEGINNER', description: 'Maintain a fixed-size window to compute range properties in O(n).', estimatedMinutes: 8, isLocked: false, order: 2 },
  { name: 'sliding-window-variable', displayName: 'Sliding Window (Variable)', track: 'TECHNIQUES', difficulty: 'INTERMEDIATE', description: 'Expand and shrink a window to satisfy a constraint in O(n).', estimatedMinutes: 10, isLocked: false, order: 3 },
] as const

// Mirrors apps/web/src/data/badges.ts's BADGE_DEFINITIONS - the client's
// checkCondition functions aren't representable here, so awardCondition
// is a human-readable description only, not executable logic. The
// server is the source of truth for which badges a user HAS (see
// apps/api/src/services/badge.service.ts); the client still decides
// WHEN to award one and calls POST /api/v1/badges/award.
const BADGES = [
  { name: 'first-step', description: 'Submit your first prediction', iconName: 'footsteps', awardCondition: 'totalPredictions >= 1' },
  { name: 'sorting-guru', description: 'Complete the entire Sorting track', iconName: 'bars', awardCondition: 'completedSortingTrack' },
  { name: 'graph-explorer', description: 'Complete the entire Graphs track', iconName: 'node', awardCondition: 'completedGraphsTrack' },
  { name: 'self-corrector', description: 'Get a junction right on the next attempt after a miss, five times', iconName: 'lightbulb-off', awardCondition: 'selfCorrections >= 5' },
  { name: 'week-warrior', description: 'Keep a 7 day practice streak alive', iconName: 'flame', awardCondition: 'streakCount >= 7' },
  { name: 'dsa-champion', description: 'Reach 80% mastery in 4 or more topics', iconName: 'trophy', awardCondition: 'masteredTopics >= 4' },
] as const

async function main() {
  // upsert (not createMany + skipDuplicates) so re-running the seed
  // after flipping a topic's isLocked/description/etc. actually applies
  // that change to a database that already has the row, instead of
  // silently skipping it as a duplicate.
  for (const topic of TOPICS) {
    await prisma.algorithmTopic.upsert({
      where: { name: topic.name },
      update: {
        displayName: topic.displayName,
        track: topic.track,
        difficulty: topic.difficulty,
        description: topic.description,
        estimatedMinutes: topic.estimatedMinutes,
        isLocked: topic.isLocked,
        order: topic.order,
      },
      create: topic,
    })
  }

  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {
        description: badge.description,
        iconName: badge.iconName,
        awardCondition: badge.awardCondition,
      },
      create: badge,
    })
  }

  console.log('Seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
