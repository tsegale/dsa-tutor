import type { RemediationTaskType, StudyTopicSlug } from './misconceptionProbes'

export interface RemediationOption {
  id: string
  text: string
}

export interface RemediationPayload {
  taskType: RemediationTaskType
  level: number
  prompt: string
  scaffold: string | null
  array?: number[]
  highlightIndices?: number[]
  options?: RemediationOption[]
  correctOptionId?: string
  freeResponse?: boolean
}

// Deterministic content generators, one per (category, study-scope
// algorithm) pair that is actually reachable given the current engines'
// emitted junctions (see misconceptionProbes.ts). None of the example
// values below appear anywhere in prisma/assessmentItemBank.ts (Phase
// 11B) - a remediation task must never reuse an assessment item or its
// exact values, so this file uses its own, disjoint set of examples.
//
// Level shapes scaffolding, matching the escalation levels in the
// remediation doc: L1 asks the bare question; L2 makes the mechanism
// (the consequence, or the boundary) explicit before asking; L3 walks the
// correct reasoning first, then asks for one guided repeat.

function scaffoldForLevel(level: number, l2: string, l3: string): string | null {
  if (level <= 1) return null
  if (level === 2) return l2
  return l3
}

function comparisonDirectionBubbleSort(level: number): RemediationPayload {
  const array = [9, 4]
  return {
    taskType: 'MICRO_PREDICTION',
    level,
    prompt: `Bubble sort is comparing index 0 (value ${array[0]}) and index 1 (value ${array[1]}). What should happen?`,
    scaffold: scaffoldForLevel(
      level,
      'Bubble sort swaps two adjacent elements only when the left one is greater than the right one.',
      'Correct reasoning: 9 is greater than 4, and bubble sort always moves the larger value to the right when they are out of order, so they swap. Now apply the same rule here.',
    ),
    array,
    highlightIndices: [0, 1],
    options: [
      { id: 'swap', text: 'Swap them' },
      { id: 'leave', text: 'Leave them' },
    ],
    correctOptionId: 'swap',
  }
}

function comparisonDirectionBinarySearch(level: number): RemediationPayload {
  const array = [2, 6, 11, 15, 20, 28]
  const target = 20
  return {
    taskType: 'MICRO_PREDICTION',
    level,
    prompt: `Searching for ${target} in [${array.join(', ')}]. The middle value is 15. Which half should the search continue in?`,
    scaffold: scaffoldForLevel(
      level,
      'If the target is greater than the middle value, the target can only be in the right half.',
      `Correct reasoning: ${target} is greater than 15, and the array is sorted ascending, so everything to the left of 15 is even smaller - the target cannot be there. Now apply the same rule here.`,
    ),
    array,
    highlightIndices: [3],
    options: [
      { id: 'left', text: 'The left half' },
      { id: 'right', text: 'The right half' },
    ],
    correctOptionId: 'right',
  }
}

function invariantMisapplicationBubbleSort(level: number): RemediationPayload {
  return {
    taskType: 'SELF_EXPLANATION',
    level,
    prompt: 'After one full pass of bubble sort, what is guaranteed about the array, and what is not guaranteed?',
    scaffold: scaffoldForLevel(
      level,
      'Think separately about the single element that just finished bubbling, and about everything else.',
      'Worked answer: only the last element reached by that pass is guaranteed to be in its final sorted position. Nothing else in the array is guaranteed sorted yet, even if it looks close. Now write this in your own words for a different array.',
    ),
    freeResponse: true,
  }
}

function prematureTerminationBubbleSort(level: number): RemediationPayload {
  const array = [3, 1, 6, 5]
  return {
    taskType: 'COUNTEREXAMPLE',
    level,
    prompt: `Bubble sort's first pass on [${array.join(', ')}] makes one swap (3 and 1). If the algorithm stopped right after that single swap, what would the final array be?`,
    scaffold: scaffoldForLevel(
      level,
      'Stopping after one swap means none of the later comparisons in the pass happen at all - trace what the array looks like at that exact point.',
      'Worked answer: stopping there leaves [1, 3, 6, 5] - still unsorted, since 6 and 5 were never compared. Early termination is only safe once a full pass makes zero swaps. Now predict the consequence for a different array.',
    ),
    array,
    highlightIndices: [0, 1],
    options: [
      { id: 'a', text: '[1, 3, 6, 5] - still unsorted' },
      { id: 'b', text: '[1, 3, 5, 6] - fully sorted' },
    ],
    correctOptionId: 'a',
  }
}

function boundaryConditionBinarySearch(level: number): RemediationPayload {
  const array = [4, 9, 13, 18, 22, 30, 35]
  return {
    taskType: 'TRACE_COMPLETION',
    level,
    prompt: `Binary search over [${array.join(', ')}] (indices 0-6) for target 35. Complete the trace: what are low, high, and mid on the final step before the target is found?`,
    scaffold: scaffoldForLevel(
      level,
      'Focus only on the boundary indices - what happens to "high" as the search narrows toward the last element?',
      'Worked answer: low=6, high=6, mid=6 (value 35) - the last element is a valid, reachable position, not one past the end. Now complete the same trace for a target at the first index instead.',
    ),
    array,
    highlightIndices: [6],
    options: [
      { id: 'a', text: 'low=6, high=6, mid=6' },
      { id: 'b', text: 'low=7, high=6, mid=6' },
    ],
    correctOptionId: 'a',
  }
}

function boundaryConditionBubbleSort(level: number): RemediationPayload {
  const array = [7, 2, 5, 9]
  return {
    taskType: 'TRACE_COMPLETION',
    level,
    prompt: `An array of 4 elements has 3 adjacent pairs to compare in one pass: (0,1), (1,2), (2,3). For [${array.join(', ')}], which index pair is the LAST comparison of the pass?`,
    scaffold: scaffoldForLevel(
      level,
      'Count the pairs from the start: with 4 elements there are exactly n-1 = 3 comparisons in a full pass.',
      'Worked answer: the last comparison is always between the second-to-last and last index - here, indices 2 and 3. Now find the last comparison for a 5-element array.',
    ),
    array,
    highlightIndices: [2, 3],
    options: [
      { id: 'a', text: 'Indices 0 and 1' },
      { id: 'b', text: 'Indices 2 and 3' },
    ],
    correctOptionId: 'b',
  }
}

function stabilityConfusionBubbleSort(level: number): RemediationPayload {
  const array = [6, 6, 3]
  return {
    taskType: 'MICRO_PREDICTION',
    level,
    prompt: `Bubble sort is comparing index 0 (value ${array[0]}) and index 1 (value ${array[1]}) - they are equal. What should happen?`,
    scaffold: scaffoldForLevel(
      level,
      'A swap only happens when the left value is strictly greater than the right value.',
      'Worked answer: equal values are never swapped - swapping identical values would change nothing about the order but could reorder equal elements relative to each other, which stable sorts avoid. Now apply the same rule here.',
    ),
    array,
    highlightIndices: [0, 1],
    options: [
      { id: 'swap', text: 'Swap them' },
      { id: 'leave', text: 'Leave them' },
    ],
    correctOptionId: 'leave',
  }
}

function structuralPropertyViolationBubbleSort(level: number): RemediationPayload {
  const array = [8, 2]
  return {
    taskType: 'COUNTEREXAMPLE',
    level,
    prompt: `Bubble sort is comparing index 0 (value ${array[0]}) and index 1 (value ${array[1]}) and leaves them as they are. Is the array now closer to sorted, or further from it?`,
    scaffold: scaffoldForLevel(
      level,
      'Two adjacent elements that are out of order and left untouched are still out of order - nothing about "leaving them" fixes that.',
      'Worked answer: further from sorted - 8 and 2 are still in the wrong relative order, and skipping the swap here means a later pass will have to fix it, or it never gets fixed at all. Now judge the same situation for a different pair.',
    ),
    array,
    highlightIndices: [0, 1],
    options: [
      { id: 'closer', text: 'Closer to sorted' },
      { id: 'further', text: 'Further from sorted' },
    ],
    correctOptionId: 'further',
  }
}

function structuralPropertyViolationBst(level: number): RemediationPayload {
  return {
    taskType: 'COUNTEREXAMPLE',
    level,
    prompt:
      'A BST has root 12, with a left child 15. Is this a valid BST? If not, what would need to be true instead?',
    scaffold: scaffoldForLevel(
      level,
      'Check the BST invariant in just this one relationship: what must every value in a left subtree satisfy relative to its parent?',
      'Worked answer: this is invalid - every value in the left subtree must be less than the root (12), and 15 is greater. A valid left child here would need to be less than 12. Now check a different parent/child pair.',
    ),
    options: [
      { id: 'valid', text: 'Valid - BSTs only constrain the right subtree' },
      { id: 'invalid', text: 'Invalid - the left child must be less than 12' },
    ],
    correctOptionId: 'invalid',
  }
}

type Generator = (level: number) => RemediationPayload

const GENERATORS: Partial<Record<string, Partial<Record<StudyTopicSlug, Generator>>>> = {
  COMPARISON_DIRECTION: {
    'bubble-sort': comparisonDirectionBubbleSort,
    'binary-search': comparisonDirectionBinarySearch,
  },
  INVARIANT_MISAPPLICATION: {
    'bubble-sort': invariantMisapplicationBubbleSort,
  },
  PREMATURE_TERMINATION: {
    'bubble-sort': prematureTerminationBubbleSort,
  },
  BOUNDARY_CONDITION: {
    'binary-search': boundaryConditionBinarySearch,
    'bubble-sort': boundaryConditionBubbleSort,
  },
  OFF_BY_ONE: {
    'binary-search': boundaryConditionBinarySearch,
    'bubble-sort': boundaryConditionBubbleSort,
  },
  STABILITY_CONFUSION: {
    'bubble-sort': stabilityConfusionBubbleSort,
  },
  STRUCTURAL_PROPERTY_VIOLATION: {
    bst: structuralPropertyViolationBst,
    'bubble-sort': structuralPropertyViolationBubbleSort,
  },
}

/** Returns null when this (category, algorithm) pair has no authored
 * remediation content - the caller falls back to the existing bottom-out
 * explanation rather than presenting nothing. */
export function generateRemediationTask(
  category: string,
  algorithmTopicSlug: string,
  level: number,
): RemediationPayload | null {
  const generator = GENERATORS[category]?.[algorithmTopicSlug as StudyTopicSlug]
  return generator ? generator(level) : null
}
