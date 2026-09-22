// The pre/post-test item bank. Pure data, no Prisma or AI imports - this
// file must never be imported from anywhere under apps/ai, and no stem or
// option text here may appear in any apps/ai/prompts file (see
// noPromptContamination.test.ts). Contaminating the instrument by letting
// the tutor see or react to these exact items invalidates the study.

export type ItemOption = { id: string; text: string }

export type ItemDefinition = {
  order: number
  itemType: 'MULTIPLE_CHOICE' | 'TRACE'
  stem: string
  options: ItemOption[] | null
  // MULTIPLE_CHOICE: the correct option's id. TRACE: the canonical
  // exact-match answer string.
  correctOptionId: string
  conceptTag: string
  maxScore: number
}

export type TopicItemBank = {
  topicSlug: string
  items: ItemDefinition[]
}

const BUBBLE_SORT_ITEMS: ItemDefinition[] = [
  {
    order: 1,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'After the first full pass of bubble sort on [5, 2, 8, 1], which element is guaranteed to be in its final sorted position?',
    options: [
      { id: 'a', text: '5' },
      { id: 'b', text: '2' },
      { id: 'c', text: '8' },
      { id: 'd', text: '1' },
    ],
    correctOptionId: 'c',
    conceptTag: 'PASS_BOUNDARY',
    maxScore: 1,
  },
  {
    order: 2,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Bubble sort compares two adjacent elements and swaps them when:',
    options: [
      { id: 'a', text: 'they are equal' },
      { id: 'b', text: 'the left element is greater than the right element' },
      { id: 'c', text: 'the left element is less than the right element' },
      { id: 'd', text: 'the right element is greater than the left element' },
    ],
    correctOptionId: 'b',
    conceptTag: 'SWAP_CONDITION',
    maxScore: 1,
  },
  {
    order: 3,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Bubble sort (with the standard early-exit optimisation) is run on an already-sorted 4-element array. How many comparisons does the final pass make before it stops?',
    options: [
      { id: 'a', text: '0' },
      { id: 'b', text: '3' },
      { id: 'c', text: '6' },
      { id: 'd', text: '12' },
    ],
    correctOptionId: 'b',
    conceptTag: 'EDGE_SORTED',
    maxScore: 1,
  },
  {
    order: 4,
    itemType: 'TRACE',
    stem: 'Hand-trace bubble sort on [4, 3, 2, 1]. Write the array state after exactly one full pass, as comma-separated numbers with no spaces (e.g. 1,2,3,4).',
    options: null,
    correctOptionId: '3,2,1,4',
    conceptTag: 'PASS_BOUNDARY',
    maxScore: 1,
  },
  {
    order: 5,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Bubble sort is run on [7, 7, 7, 7] (all identical elements). How many swaps occur in total?',
    options: [
      { id: 'a', text: '0' },
      { id: 'b', text: '3' },
      { id: 'c', text: '6' },
      { id: 'd', text: 'It depends on the comparison order' },
    ],
    correctOptionId: 'a',
    conceptTag: 'EDGE_DUPLICATES',
    maxScore: 1,
  },
  {
    order: 6,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'What happens when bubble sort is run on an array with exactly one element?',
    options: [
      { id: 'a', text: 'It throws an error' },
      { id: 'b', text: 'It performs one comparison and no swaps' },
      { id: 'c', text: 'It returns the array unchanged, with no comparisons' },
      { id: 'd', text: 'It swaps the element with itself' },
    ],
    correctOptionId: 'c',
    conceptTag: 'EDGE_SINGLE',
    maxScore: 1,
  },
  {
    order: 7,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'For an n-element array, after how many full passes is bubble sort guaranteed to be complete in the worst case?',
    options: [
      { id: 'a', text: 'log2(n)' },
      { id: 'b', text: 'n' },
      { id: 'c', text: 'n - 1' },
      { id: 'd', text: 'n^2' },
    ],
    correctOptionId: 'c',
    conceptTag: 'TERMINATION',
    maxScore: 1,
  },
  {
    order: 8,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'After pass 1 of bubble sort on [3, 1, 4, 1, 5], the array is [1, 3, 1, 4, 5]. Which of these is the correct result of pass 2?',
    options: [
      { id: 'a', text: '[1, 1, 3, 4, 5]' },
      { id: 'b', text: '[1, 3, 4, 1, 5]' },
      { id: 'c', text: '[3, 1, 1, 4, 5]' },
    ],
    correctOptionId: 'a',
    conceptTag: 'PASS_BOUNDARY',
    maxScore: 1,
  },
]

const BINARY_SEARCH_ITEMS: ItemDefinition[] = [
  {
    order: 1,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Binary search is run on a sorted array of 15 elements. What is the maximum number of comparisons needed to find a target or determine it is absent?',
    options: [
      { id: 'a', text: '15' },
      { id: 'b', text: '8' },
      { id: 'c', text: '4' },
      { id: 'd', text: '1' },
    ],
    correctOptionId: 'c',
    conceptTag: 'COMPARISON_COUNT',
    maxScore: 1,
  },
  {
    order: 2,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'In binary search, if the middle element is less than the target, what happens next?',
    options: [
      { id: 'a', text: 'Search the left half' },
      { id: 'b', text: 'Search the right half' },
      { id: 'c', text: 'Return not found' },
      { id: 'd', text: 'Search both halves' },
    ],
    correctOptionId: 'b',
    conceptTag: 'BOUNDARY_UPDATE',
    maxScore: 1,
  },
  {
    order: 3,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'What invariant does binary search rely on to work correctly?',
    options: [
      { id: 'a', text: 'The array must contain no duplicates' },
      { id: 'b', text: 'The array must be sorted' },
      { id: 'c', text: 'The array must have an even number of elements' },
      { id: 'd', text: 'The array must contain only integers' },
    ],
    correctOptionId: 'b',
    conceptTag: 'INVARIANT',
    maxScore: 1,
  },
  {
    order: 4,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Binary search is run on an empty array. What is the result?',
    options: [
      { id: 'a', text: 'It throws an error' },
      { id: 'b', text: "It returns 'not found' after one comparison" },
      { id: 'c', text: "It returns 'not found' with zero comparisons" },
      { id: 'd', text: 'It loops forever' },
    ],
    correctOptionId: 'c',
    conceptTag: 'EDGE_EMPTY',
    maxScore: 1,
  },
  {
    order: 5,
    itemType: 'TRACE',
    stem: 'Hand-trace binary search for target 9 in [1, 3, 5, 7, 9, 11, 13]. List the sequence of middle VALUES compared, comma-separated with no spaces (e.g. 5,9).',
    options: null,
    correctOptionId: '7,11,9',
    conceptTag: 'MID_CALCULATION',
    maxScore: 1,
  },
  {
    order: 6,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Binary search is run on the single-element array [42], searching for 42. Counting one comparison per iteration (as in the earlier question about a 15-element array), how many comparisons occur?',
    options: [
      { id: 'a', text: '0' },
      { id: 'b', text: '1' },
      { id: 'c', text: '2' },
      { id: 'd', text: 'log2(1)' },
    ],
    correctOptionId: 'b',
    conceptTag: 'EDGE_SINGLE',
    maxScore: 1,
  },
  {
    order: 7,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Why do textbooks recommend a bounds-safe way of computing the midpoint index, rather than simply averaging the two boundary indices directly?',
    options: [
      { id: 'a', text: 'Averaging directly can silently overflow on very large arrays in some languages' },
      { id: 'b', text: 'It makes the algorithm run in constant time instead of logarithmic time' },
      { id: 'c', text: 'It guarantees the array never needs to be sorted first' },
      { id: 'd', text: 'It changes binary search from iterative to recursive' },
    ],
    correctOptionId: 'a',
    conceptTag: 'MID_CALCULATION',
    maxScore: 1,
  },
  {
    order: 8,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'A binary search for a target that is not present in the array terminates when:',
    options: [
      { id: 'a', text: 'low exceeds high' },
      { id: 'b', text: 'mid equals the target' },
      { id: 'c', text: 'the array becomes empty' },
      { id: 'd', text: '100 iterations have passed' },
    ],
    correctOptionId: 'a',
    conceptTag: 'TERMINATION',
    maxScore: 1,
  },
]

const BST_ITEMS: ItemDefinition[] = [
  {
    order: 1,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'In a binary search tree, for any node, every value in its left subtree is:',
    options: [
      { id: 'a', text: 'Greater than the node' },
      { id: 'b', text: 'Less than the node' },
      { id: 'c', text: 'Equal to the node' },
      { id: 'd', text: 'Unordered relative to the node' },
    ],
    correctOptionId: 'b',
    conceptTag: 'BST_INVARIANT',
    maxScore: 1,
  },
  {
    order: 2,
    itemType: 'MULTIPLE_CHOICE',
    stem: "Inserting 15 into a BST rooted at 10 (whose right child is 20): which path does 15 take?",
    options: [
      { id: 'a', text: 'It becomes the new root' },
      { id: 'b', text: 'Left of 10' },
      { id: 'c', text: 'Right of 10, then compared against 20' },
      { id: 'd', text: 'It replaces 20' },
    ],
    correctOptionId: 'c',
    conceptTag: 'INSERT_DIRECTION',
    maxScore: 1,
  },
  {
    order: 3,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'An in-order traversal of a valid BST always visits nodes in:',
    options: [
      { id: 'a', text: 'Random order' },
      { id: 'b', text: 'Ascending sorted order' },
      { id: 'c', text: 'Descending sorted order' },
      { id: 'd', text: 'The order they were inserted' },
    ],
    correctOptionId: 'b',
    conceptTag: 'TRAVERSAL_ORDER',
    maxScore: 1,
  },
  {
    order: 4,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'When deleting a BST node that has two children, the standard approach replaces it with:',
    options: [
      { id: 'a', text: 'Its parent' },
      { id: 'b', text: 'Its in-order successor (or predecessor)' },
      { id: 'c', text: 'Null, removing the whole subtree' },
      { id: 'd', text: 'The root of the tree' },
    ],
    correctOptionId: 'b',
    conceptTag: 'DELETE_CASE',
    maxScore: 1,
  },
  {
    order: 5,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'What is the result of searching an empty BST for any value?',
    options: [
      { id: 'a', text: 'Undefined behaviour' },
      { id: 'b', text: 'Not found, after zero comparisons' },
      { id: 'c', text: 'An error is thrown' },
      { id: 'd', text: 'It returns the root' },
    ],
    correctOptionId: 'b',
    conceptTag: 'EDGE_EMPTY',
    maxScore: 1,
  },
  {
    order: 6,
    itemType: 'TRACE',
    stem: 'A BST is built by inserting these values in order: 8, 3, 10, 1, 6. Write the in-order traversal as comma-separated numbers with no spaces.',
    options: null,
    correctOptionId: '1,3,6,8,10',
    conceptTag: 'TRAVERSAL_ORDER',
    maxScore: 1,
  },
  {
    order: 7,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'Using the convention that height counts edges on the longest root-to-leaf path (so an empty tree has height -1), a BST with a single node (the root, no children) has height:',
    options: [
      { id: 'a', text: '-1' },
      { id: 'b', text: '0' },
      { id: 'c', text: '1' },
      { id: 'd', text: 'Undefined' },
    ],
    correctOptionId: 'b',
    conceptTag: 'EDGE_SINGLE',
    maxScore: 1,
  },
  {
    order: 8,
    itemType: 'MULTIPLE_CHOICE',
    stem: 'The in-order successor of a node that has a right child is:',
    options: [
      { id: 'a', text: "The node's parent" },
      { id: 'b', text: 'The right child itself' },
      { id: 'c', text: 'The leftmost node in the right subtree' },
      { id: 'd', text: 'The rightmost node in the whole tree' },
    ],
    correctOptionId: 'c',
    conceptTag: 'SUCCESSOR',
    maxScore: 1,
  },
]

export const ITEM_BANK: TopicItemBank[] = [
  { topicSlug: 'bubble-sort', items: BUBBLE_SORT_ITEMS },
  { topicSlug: 'binary-search', items: BINARY_SEARCH_ITEMS },
  { topicSlug: 'bst', items: BST_ITEMS },
]
