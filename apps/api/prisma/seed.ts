import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TOPICS = [
  { name: 'bubble-sort', displayName: 'Bubble Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Repeatedly compare and swap adjacent elements until the array is sorted.', estimatedMinutes: 8, isLocked: false },
  { name: 'selection-sort', displayName: 'Selection Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Find the minimum element and place it at the beginning, repeat for remaining elements.', estimatedMinutes: 8, isLocked: false },
  { name: 'insertion-sort', displayName: 'Insertion Sort', track: 'SORTING', difficulty: 'BEGINNER', description: 'Build a sorted array one element at a time by inserting each into its correct position.', estimatedMinutes: 8, isLocked: false },
  { name: 'merge-sort', displayName: 'Merge Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Divide the array in half recursively then merge the sorted halves.', estimatedMinutes: 12, isLocked: false },
  { name: 'quick-sort', displayName: 'Quick Sort', track: 'SORTING', difficulty: 'INTERMEDIATE', description: 'Choose a pivot and partition elements around it, then recursively sort each partition.', estimatedMinutes: 12, isLocked: false },
  { name: 'binary-search', displayName: 'Binary Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Search a sorted array by repeatedly halving the search space.', estimatedMinutes: 6, isLocked: false },
  { name: 'linear-search', displayName: 'Linear Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Check each element one by one until the target is found.', estimatedMinutes: 4, isLocked: false },
  { name: 'stack', displayName: 'Stack', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Last-in first-out data structure with push and pop operations.', estimatedMinutes: 6, isLocked: false },
  { name: 'linked-list', displayName: 'Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Linear data structure where each node points to the next.', estimatedMinutes: 8, isLocked: true },
  { name: 'bst', displayName: 'Binary Search Tree', track: 'TREES', difficulty: 'INTERMEDIATE', description: 'A tree where left children are smaller and right children are larger than the parent.', estimatedMinutes: 12, isLocked: false },
  { name: 'bfs', displayName: 'Breadth-First Search', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Explore a graph level by level using a queue.', estimatedMinutes: 10, isLocked: false },
  { name: 'dfs', displayName: 'Depth-First Search', track: 'GRAPHS', difficulty: 'INTERMEDIATE', description: 'Explore a graph by going as deep as possible before backtracking.', estimatedMinutes: 10, isLocked: true },

  // Foundations track additions - array operations, all unlocked
  { name: 'array-access', displayName: 'Array Access', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Access any element in O(1) time using its index.', estimatedMinutes: 4, isLocked: false },
  { name: 'array-insert', displayName: 'Array Insertion', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Insert an element at any position, shifting others right.', estimatedMinutes: 5, isLocked: false },
  { name: 'array-delete', displayName: 'Array Deletion', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Delete an element at any position, shifting others left.', estimatedMinutes: 5, isLocked: false },

  // Linked lists
  { name: 'singly-linked-list', displayName: 'Singly Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Nodes connected by a single forward pointer.', estimatedMinutes: 10, isLocked: false },
  { name: 'doubly-linked-list', displayName: 'Doubly Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Nodes connected by both forward and backward pointers.', estimatedMinutes: 10, isLocked: false },
  { name: 'circular-linked-list', displayName: 'Circular Linked List', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'A linked list where the last node points back to the head.', estimatedMinutes: 8, isLocked: false },

  // Stack and Queue
  { name: 'stack', displayName: 'Stack', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Last-in first-out - push and pop from the same end.', estimatedMinutes: 8, isLocked: false },
  { name: 'queue', displayName: 'Queue', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'First-in first-out - enqueue at rear, dequeue from front.', estimatedMinutes: 8, isLocked: false },
  { name: 'circular-queue', displayName: 'Circular Queue', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'A queue that wraps around to reuse freed space.', estimatedMinutes: 8, isLocked: false },
  { name: 'deque', displayName: 'Deque', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Double-ended queue - insert and remove from both ends.', estimatedMinutes: 8, isLocked: false },

  // Hash table
  { name: 'hash-table-chaining', displayName: 'Hash Table (Chaining)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Resolve collisions by chaining entries in the same bucket.', estimatedMinutes: 12, isLocked: false },
  { name: 'hash-table-probing', displayName: 'Hash Table (Linear Probing)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Resolve collisions by probing for the next empty slot.', estimatedMinutes: 12, isLocked: false },

  // Additional search
  { name: 'jump-search', displayName: 'Jump Search', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Jump ahead by √n steps then search linearly within the block.', estimatedMinutes: 6, isLocked: false },
  { name: 'interpolation-search', displayName: 'Interpolation Search', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Estimate the probe position using the value distribution.', estimatedMinutes: 8, isLocked: false },
  { name: 'exponential-search', displayName: 'Exponential Search', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Double the search bound then apply binary search.', estimatedMinutes: 6, isLocked: false },

  // Recursion
  { name: 'recursion-factorial', displayName: 'Recursion: Factorial', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Classic recursion: n! computed by reducing to smaller subproblems.', estimatedMinutes: 8, isLocked: false },
  { name: 'recursion-fibonacci', displayName: 'Recursion: Fibonacci', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Naive recursive Fibonacci exposes the overlapping subproblems problem.', estimatedMinutes: 10, isLocked: false },

  // Two pointer and sliding window
  { name: 'two-pointer', displayName: 'Two Pointer Technique', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Solve array problems in O(n) using two moving pointers.', estimatedMinutes: 8, isLocked: false },
  { name: 'sliding-window-fixed', displayName: 'Sliding Window (Fixed)', track: 'FOUNDATIONS', difficulty: 'BEGINNER', description: 'Maintain a fixed-size window to compute range properties in O(n).', estimatedMinutes: 8, isLocked: false },
  { name: 'sliding-window-variable', displayName: 'Sliding Window (Variable)', track: 'FOUNDATIONS', difficulty: 'INTERMEDIATE', description: 'Expand and shrink a window to satisfy a constraint in O(n).', estimatedMinutes: 10, isLocked: false },
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
      },
      create: topic,
    })
  }
  console.log('Seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
