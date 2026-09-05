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
