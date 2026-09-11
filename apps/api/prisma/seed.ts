import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TOPICS = [
  { name: 'bubble-sort', displayName: 'Bubble Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Repeatedly compare and swap adjacent elements until the array is sorted.', estimatedMinutes: 8, isLocked: false, order: 999 },
  { name: 'selection-sort', displayName: 'Selection Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Find the minimum element and place it at the beginning, repeat for remaining elements.', estimatedMinutes: 8, isLocked: false, order: 999 },
  { name: 'insertion-sort', displayName: 'Insertion Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Build a sorted array one element at a time by inserting each into its correct position.', estimatedMinutes: 8, isLocked: false, order: 999 },
  { name: 'merge-sort', displayName: 'Merge Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Divide the array in half recursively then merge the sorted halves.', estimatedMinutes: 12, isLocked: false, order: 999 },
  { name: 'quick-sort', displayName: 'Quick Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Choose a pivot and partition elements around it, then recursively sort each partition.', estimatedMinutes: 12, isLocked: false, order: 999 },
  { name: 'binary-search', displayName: 'Binary Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Search a sorted array by repeatedly halving the search space.', estimatedMinutes: 6, isLocked: false, order: 999 },
  { name: 'linear-search', displayName: 'Linear Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Check each element one by one until the target is found.', estimatedMinutes: 4, isLocked: false, order: 999 },
  { name: 'stack', displayName: 'Stack', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Last-in first-out data structure with push and pop operations.', estimatedMinutes: 6, isLocked: false, order: 999 },
  // Superseded by singly/doubly/circular-linked-list below once the
  // Foundations track was built out - kept (rather than deleted) since a
  // student session may already reference it, but unlocked so it isn't a
  // dead end, and left off the pedagogical order sequence (defaults to 999).
  { name: 'linked-list', displayName: 'Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Linear data structure where each node points to the next.', estimatedMinutes: 8, isLocked: false, order: 999 },
  { name: 'bst', displayName: 'Binary Search Tree', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'A tree where left children are smaller and right children are larger than the parent.', estimatedMinutes: 12, isLocked: false, order: 999 },
  { name: 'bfs', displayName: 'Breadth-First Search', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Explore a graph level by level using a queue.', estimatedMinutes: 10, isLocked: false, order: 999 },
  { name: 'dfs', displayName: 'Depth-First Search', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Explore a graph by going as deep as possible before backtracking.', estimatedMinutes: 10, isLocked: true, order: 999 },

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
  { name: 'linear-search', displayName: 'Linear Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Check each element one by one until the target is found.', estimatedMinutes: 4, isLocked: false, order: 15 },
  { name: 'binary-search', displayName: 'Binary Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Search a sorted array by repeatedly halving the search space.', estimatedMinutes: 6, isLocked: false, order: 16 },
  { name: 'jump-search', displayName: 'Jump Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Jump ahead by √n steps then search linearly within the block.', estimatedMinutes: 6, isLocked: false, order: 17 },
  { name: 'interpolation-search', displayName: 'Interpolation Search', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Estimate the probe position using the value distribution.', estimatedMinutes: 8, isLocked: false, order: 18 },
  { name: 'exponential-search', displayName: 'Exponential Search', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Double the search bound then apply binary search.', estimatedMinutes: 6, isLocked: false, order: 19 },

  // Two pointer and sliding window
  { name: 'two-pointer', displayName: 'Two Pointer Technique', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Solve array problems in O(n) using two moving pointers.', estimatedMinutes: 8, isLocked: false, order: 20 },
  { name: 'sliding-window-fixed', displayName: 'Sliding Window (Fixed)', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Maintain a fixed-size window to compute range properties in O(n).', estimatedMinutes: 8, isLocked: false, order: 21 },
  { name: 'sliding-window-variable', displayName: 'Sliding Window (Variable)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Expand and shrink a window to satisfy a constraint in O(n).', estimatedMinutes: 10, isLocked: false, order: 22 },
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
  console.log('Seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
