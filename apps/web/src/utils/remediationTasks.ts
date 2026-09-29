import { getRemediationTaskType, type RemediationTaskType, type StudyTopicSlug } from './misconceptionProbes'

export interface RemediationOption {
  id: string
  text: string
}

/** What the wrong idea would do, shown before the level-2 question. */
export interface RemediationConsequence {
  caption: string
  array?: number[]
  highlightIndices?: number[]
}

export interface RemediationPayload {
  taskType: RemediationTaskType
  level: number
  prompt: string
  scaffold: string | null
  array?: number[]
  highlightIndices?: number[]
  consequence?: RemediationConsequence
  options?: RemediationOption[]
  correctOptionId?: string
  freeResponse?: boolean
}

// Deterministic content, one scenario per (category, study topic) pair the
// study's answer tiles can produce (misconceptionProbes.ts). Escalation
// (Week 3 3C.3), by level = remediationCount + 1:
//   L1 - a targeted micro-prediction (MICRO_PREDICTION)
//   L2 - a counterexample or trace completion, with the consequence of the
//        wrong idea shown first (the category's own remediation type)
//   L3 - a worked example of the correct reasoning, then one guided repeat
//        on a different instance (WORKED_EXAMPLE)
// None of these values appear in apps/api/src/data/assessmentItemBank.ts: a
// remediation task must never reuse an assessment item or its values.

interface Question {
  prompt: string
  array?: number[]
  highlightIndices?: number[]
  options: RemediationOption[]
  correctOptionId: string
}

interface Scenario {
  l1: Question
  l2: Question & { lead: string; consequence: RemediationConsequence }
  l3: { worked: string; repeat: Question }
}

const swapOrLeave = (correct: 'swap' | 'leave'): Pick<Question, 'options' | 'correctOptionId'> => ({
  options: [
    { id: 'swap', text: 'Swap them' },
    { id: 'leave', text: 'Leave them' },
  ],
  correctOptionId: correct,
})

const SCENARIOS: Partial<Record<string, Partial<Record<StudyTopicSlug, Scenario>>>> = {
  COMPARISON_DIRECTION: {
    'bubble-sort': {
      l1: {
        prompt: 'Bubble sort is comparing index 0 (value 9) and index 1 (value 4). What should happen?',
        array: [9, 4],
        highlightIndices: [0, 1],
        ...swapOrLeave('swap'),
      },
      l2: {
        lead: 'Here is what happens with the comparison the wrong way round.',
        consequence: {
          caption:
            'If bubble sort swapped whenever the left value was smaller, one pass on [6, 11, 2] would give [11, 6, 2] - the largest value ends up at the front, sorting the array backwards.',
          array: [11, 6, 2],
          highlightIndices: [0],
        },
        prompt: 'So which comparison makes bubble sort swap a pair?',
        options: [
          { id: 'left-greater', text: 'The left value is greater than the right value' },
          { id: 'left-smaller', text: 'The left value is smaller than the right value' },
          { id: 'always', text: 'Every pair is swapped' },
        ],
        correctOptionId: 'left-greater',
      },
      l3: {
        worked:
          'Worked example: in [12, 5], 12 is on the left and is greater than 5. Bubble sort swaps a pair only when the left value is greater, so [12, 5] becomes [5, 12] and the larger value moves right. Now try one.',
        repeat: {
          prompt: 'Bubble sort compares index 0 (value 3) and index 1 (value 14). What should happen?',
          array: [3, 14],
          highlightIndices: [0, 1],
          ...swapOrLeave('leave'),
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Searching for 20 in [2, 6, 11, 15, 20, 28]. The middle value is 15. Which half should the search continue in?',
        array: [2, 6, 11, 15, 20, 28],
        highlightIndices: [3],
        options: [
          { id: 'left', text: 'The left half' },
          { id: 'right', text: 'The right half' },
        ],
        correctOptionId: 'right',
      },
      l2: {
        lead: 'Here is what going the wrong way throws away.',
        consequence: {
          caption: 'Searching for 6 in [3, 6, 10, 17, 24]: going right of 10 keeps only 17 and 24, both larger than 6 - the target is discarded.',
          array: [3, 6, 10, 17, 24],
          highlightIndices: [3, 4],
        },
        prompt: 'Searching for 6, the middle value is 10. Which half should the search continue in?',
        options: [
          { id: 'left', text: 'The left half' },
          { id: 'right', text: 'The right half' },
        ],
        correctOptionId: 'left',
      },
      l3: {
        worked:
          'Worked example: searching for 30 in [4, 16, 23, 30, 41], the middle value is 23. 30 is greater than 23, and the array is sorted, so everything left of 23 is smaller still - only the right half can hold 30. Now try one.',
        repeat: {
          prompt: 'Searching for 13 in [1, 13, 22, 35, 48], the middle value is 22. Which half should the search continue in?',
          array: [1, 13, 22, 35, 48],
          highlightIndices: [2],
          options: [
            { id: 'left', text: 'The left half' },
            { id: 'right', text: 'The right half' },
          ],
          correctOptionId: 'left',
        },
      },
    },
    bst: {
      l1: {
        prompt: 'Inserting 23 into a BST whose root is 30. Which way does 23 go?',
        options: [
          { id: 'left', text: 'Left - 23 is less than 30' },
          { id: 'right', text: 'Right - 23 is greater than or equal to 30' },
        ],
        correctOptionId: 'left',
      },
      l2: {
        lead: 'Here is what the wrong direction does to the tree.',
        consequence: {
          caption:
            'Putting 23 to the right of 30 places a smaller value where every value must be at least 30 - a later search for 23 would go left and never find it.',
        },
        prompt: 'Inserting 41 into a BST whose root is 30. Which way does 41 go?',
        options: [
          { id: 'right', text: 'Right - 41 is greater than or equal to 30' },
          { id: 'left', text: 'Left - 41 is less than 30' },
        ],
        correctOptionId: 'right',
      },
      l3: {
        worked:
          'Worked example: inserting 12 into a BST with root 18 and left child 9: 12 is less than 18, so go left to 9; 12 is greater than or equal to 9, so go right - 12 becomes the right child of 9. Now try one.',
        repeat: {
          prompt: 'Inserting 26 into a BST with root 20 and right child 35 (35 has no children). Where does 26 end up?',
          options: [
            { id: 'left-of-35', text: 'The left child of 35' },
            { id: 'right-of-35', text: 'The right child of 35' },
            { id: 'left-of-20', text: 'The left child of 20' },
          ],
          correctOptionId: 'left-of-35',
        },
      },
    },
  },

  ORDER_OF_OPERATIONS: {
    'bubble-sort': {
      l1: {
        prompt: 'Bubble sort compares index 0 (value 2) and index 1 (value 13). What should happen?',
        array: [2, 13],
        highlightIndices: [0, 1],
        ...swapOrLeave('leave'),
      },
      l2: {
        lead: 'Here is what swapping an in-order pair does.',
        consequence: {
          caption: 'Swapping [2, 13] would give [13, 2] - the larger value now sits first, undoing order that was already correct.',
          array: [13, 2],
          highlightIndices: [0, 1],
        },
        prompt: 'When should bubble sort swap two neighbours?',
        options: [
          { id: 'out-of-order', text: 'Only when the left value is greater than the right' },
          { id: 'always', text: 'Every time it compares them' },
          { id: 'different', text: 'Whenever the two values are different' },
        ],
        correctOptionId: 'out-of-order',
      },
      l3: {
        worked:
          'Worked example: [4, 11] is already in order - 4 is smaller than 11 - so bubble sort leaves it. [11, 4] is out of order, so that one is swapped. Now try one.',
        repeat: {
          prompt: 'Bubble sort compares 16 and 21, in that order. What should happen?',
          array: [16, 21],
          highlightIndices: [0, 1],
          ...swapOrLeave('leave'),
        },
      },
    },
  },

  STRUCTURAL_PROPERTY_VIOLATION: {
    'bubble-sort': {
      l1: {
        prompt: 'Bubble sort compares index 0 (value 17) and index 1 (value 6). What should happen?',
        array: [17, 6],
        highlightIndices: [0, 1],
        ...swapOrLeave('swap'),
      },
      l2: {
        lead: 'Here is what leaving an out-of-order pair does.',
        consequence: {
          caption: 'Leaving [17, 6] as it is means 17 never moves right past 6, so the array can never finish sorted.',
          array: [17, 6],
          highlightIndices: [0, 1],
        },
        prompt: 'What must be true of every pair of neighbours when bubble sort finishes?',
        options: [
          { id: 'ordered', text: 'The left value is not greater than the right value' },
          { id: 'equal', text: 'The two values are equal' },
          { id: 'any', text: 'Nothing - neighbours can be in any order' },
        ],
        correctOptionId: 'ordered',
      },
      l3: {
        worked:
          'Worked example: in [15, 8], 15 is greater and on the left, so the pair is out of order and bubble sort swaps it to [8, 15]. Now try one.',
        repeat: {
          prompt: 'Bubble sort compares 23 and 19, in that order. What should happen?',
          array: [23, 19],
          highlightIndices: [0, 1],
          ...swapOrLeave('swap'),
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Does binary search change the order of the array while it searches?',
        options: [
          { id: 'no', text: 'No - it only reads values; the array must already be sorted' },
          { id: 'yes', text: 'Yes - it sorts the array as it goes' },
          { id: 'half', text: 'It sorts only the half it keeps' },
        ],
        correctOptionId: 'no',
      },
      l2: {
        lead: 'Here is what happens when the array is not sorted first.',
        consequence: {
          caption:
            'On the unsorted [9, 21, 30, 4, 16], searching for 4: the middle value is 30, so the search goes left - and 4, sitting to the right, is never found.',
          array: [9, 21, 30, 4, 16],
          highlightIndices: [3],
        },
        prompt: 'Why did that search miss 4?',
        options: [
          { id: 'unsorted', text: 'The array was not sorted, so going left threw 4 away' },
          { id: 'small', text: 'Binary search cannot find small values' },
          { id: 'middle', text: 'The middle index was calculated wrongly' },
        ],
        correctOptionId: 'unsorted',
      },
      l3: {
        worked:
          'Worked example: binary search never moves values. It relies on the array already being sorted, so that everything left of the middle is smaller: [12, 5, 19] must become [5, 12, 19] before halving can work. Now try one.',
        repeat: {
          prompt: 'A search for 27 in [6, 13, 27, 40, 52] finds it at index 2. What did the search do to the array?',
          options: [
            { id: 'nothing', text: 'Nothing - the array is unchanged' },
            { id: 'sorted', text: 'It sorted the array' },
            { id: 'removed', text: 'It removed the values it ruled out' },
          ],
          correctOptionId: 'nothing',
        },
      },
    },
    bst: {
      l1: {
        prompt: 'A BST has root 12 with a left child 15. Is this a valid BST?',
        options: [
          { id: 'invalid', text: 'Invalid - a left child must be less than 12' },
          { id: 'valid', text: 'Valid - only the right side is constrained' },
        ],
        correctOptionId: 'invalid',
      },
      l2: {
        lead: 'Here is what that breaks.',
        consequence: {
          caption: 'Searching that tree for 15 compares with 12, goes right (15 is larger) and finds nothing - the 15 on the left is lost.',
        },
        prompt: "Every value in a node's left subtree must be:",
        options: [
          { id: 'less', text: 'Less than the node' },
          { id: 'greater', text: 'Greater than the node' },
          { id: 'any', text: 'Any value' },
        ],
        correctOptionId: 'less',
      },
      l3: {
        worked:
          'Worked example: root 25 with left child 17 and right child 31 is valid - 17 is less than 25 on the left, and 31 is at least 25 on the right. Now try one.',
        repeat: {
          prompt: 'A BST has root 40 with a right child 33. Is it valid?',
          options: [
            { id: 'invalid', text: 'Invalid - a right child must be at least 40' },
            { id: 'valid', text: 'Valid' },
          ],
          correctOptionId: 'invalid',
        },
      },
    },
  },

  INVARIANT_MISAPPLICATION: {
    'bubble-sort': {
      l1: {
        prompt: 'Pass 1 on [8, 2, 6, 3] has just finished, giving [2, 6, 3, 8]. Is the whole array now guaranteed sorted?',
        array: [2, 6, 3, 8],
        highlightIndices: [3],
        options: [
          { id: 'only-last', text: 'No - only 8, at the end, is guaranteed in place' },
          { id: 'yes', text: 'Yes - the pass is complete' },
          { id: 'only-first', text: 'No - only 2, at the front, is guaranteed in place' },
        ],
        correctOptionId: 'only-last',
      },
      l2: {
        lead: 'Here is what treating one pass as the end would leave.',
        consequence: {
          caption: 'Stopping after that pass leaves [2, 6, 3, 8] - 6 and 3 are still out of order.',
          array: [2, 6, 3, 8],
          highlightIndices: [1, 2],
        },
        prompt: 'What does one completed pass guarantee?',
        options: [
          { id: 'largest', text: 'The largest remaining unsorted value is now in its final position' },
          { id: 'all', text: 'Every value is in its final position' },
          { id: 'first', text: 'The first value is in its final position' },
        ],
        correctOptionId: 'largest',
      },
      l3: {
        worked:
          'Worked example: pass 1 on [7, 12, 1, 5] carries 12 to the end, giving [7, 1, 5, 12]. Only 12 is guaranteed in place; 7, 1 and 5 still need more passes. Now try one.',
        repeat: {
          prompt: 'Pass 1 on [10, 4, 13, 2] gives [4, 10, 2, 13]. Which value is now guaranteed in its final position?',
          array: [4, 10, 2, 13],
          options: [
            { id: '13', text: '13' },
            { id: '4', text: '4' },
            { id: '10', text: '10' },
          ],
          correctOptionId: '13',
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Binary search keeps one thing true at every step. Which?',
        options: [
          { id: 'range', text: 'If the target is in the array, it lies between low and high' },
          { id: 'middle', text: 'The target is always at the middle index' },
          { id: 'outside', text: 'Everything outside low to high is unsorted' },
        ],
        correctOptionId: 'range',
      },
      l2: {
        lead: 'Here is a case the wrong rule gets wrong.',
        consequence: {
          caption: 'A target can be missing from a perfectly sorted array: [5, 12, 18, 25] is sorted and has no 20.',
          array: [5, 12, 18, 25],
        },
        prompt: 'A search for 20 in [5, 12, 18, 25] ends with low past high. Why?',
        options: [
          { id: 'absent', text: '20 is not in the array' },
          { id: 'unsorted', text: 'The array was not sorted' },
          { id: 'skipped', text: 'The search skipped over 20' },
        ],
        correctOptionId: 'absent',
      },
      l3: {
        worked:
          'Worked example: searching [3, 9, 14, 26, 33] for 26: 14 is too small, so low moves to index 3 - indices 3 to 4 still hold every place 26 could be, and it is there. Now try one.',
        repeat: {
          prompt: 'Searching [1, 8, 15, 22, 36] for 8, the first middle value is 15. Where can 8 still be?',
          array: [1, 8, 15, 22, 36],
          highlightIndices: [2],
          options: [
            { id: 'left', text: 'Indices 0 to 1' },
            { id: 'right', text: 'Indices 3 to 4' },
            { id: 'anywhere', text: 'Anywhere in the array' },
          ],
          correctOptionId: 'left',
        },
      },
    },
    bst: {
      l1: {
        prompt: 'Deleting 20 from a BST: 20 has a left child 14 (which has a right child 17) and a right child 27 (with no left child). What replaces 20?',
        options: [
          { id: 'successor', text: '27, its in-order successor' },
          { id: 'left', text: '14, its left child' },
          { id: 'parent', text: "Its parent's value" },
        ],
        correctOptionId: 'successor',
      },
      l2: {
        lead: 'Here is what the wrong replacement breaks.',
        consequence: {
          caption: "Putting 14 in 20's place would leave 17 in 14's left subtree - a value greater than 14 on its left, breaking the ordering.",
        },
        prompt: 'Why is the in-order successor a safe replacement?',
        options: [
          { id: 'order', text: 'It is larger than everything on the left and no larger than anything on the right' },
          { id: 'smallest', text: 'It is the smallest value in the whole tree' },
          { id: 'leaf', text: 'It is always a leaf, so nothing else moves' },
        ],
        correctOptionId: 'order',
      },
      l3: {
        worked:
          "Worked example: deleting 50, whose children are 30 and 70, where 70's leftmost descendant is 60: 60 is the smallest value on the right, so it replaces 50 and its old node is removed. Now try one.",
        repeat: {
          prompt: "Deleting 44, whose right child is 52, and 52's left child is 48 (with no children). What replaces 44?",
          options: [
            { id: '48', text: '48' },
            { id: '52', text: '52' },
            { id: 'nothing', text: 'Nothing - its left subtree moves up' },
          ],
          correctOptionId: '48',
        },
      },
    },
  },

  PREMATURE_TERMINATION: {
    'bubble-sort': {
      l1: {
        prompt: 'Pass 1 on [9, 3, 7, 1] has finished, giving [3, 7, 1, 9]. Can bubble sort stop now?',
        array: [3, 7, 1, 9],
        options: [
          { id: 'no', text: 'No - that pass made swaps, so another pass is needed' },
          { id: 'yes', text: 'Yes - the largest value is at the end' },
        ],
        correctOptionId: 'no',
      },
      l2: {
        lead: 'Here is what stopping too soon leaves behind.',
        consequence: {
          caption: 'Stopping now leaves [3, 7, 1, 9] - 7 and 1 are still out of order.',
          array: [3, 7, 1, 9],
          highlightIndices: [1, 2],
        },
        prompt: 'When is bubble sort allowed to stop early?',
        options: [
          { id: 'no-swaps', text: 'After a pass that made no swaps' },
          { id: 'largest', text: 'As soon as the largest value reaches the end' },
          { id: 'half', text: 'After half of the passes' },
        ],
        correctOptionId: 'no-swaps',
      },
      l3: {
        worked:
          'Worked example: on [2, 5, 4, 8], pass 1 swaps 5 and 4, giving [2, 4, 5, 8]. That pass made a swap, so pass 2 runs; pass 2 makes no swaps, and only then can it stop. Now try one.',
        repeat: {
          prompt: 'A pass of bubble sort has just made no swaps. What happens next?',
          options: [
            { id: 'stop', text: 'It stops - the array is sorted' },
            { id: 'continue', text: 'It runs the remaining passes anyway' },
            { id: 'restart', text: 'It starts again from the first pass' },
          ],
          correctOptionId: 'stop',
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Searching [4, 10, 15, 22, 29] for 18: 15 was too small, then 22 was too big, and now low (3) is past high (2). What should happen?',
        array: [4, 10, 15, 22, 29],
        options: [
          { id: 'stop', text: 'Stop - 18 is not in the array' },
          { id: 'restart', text: 'Start over from the beginning in case it was missed' },
          { id: 'continue', text: 'Keep checking the remaining values one by one' },
        ],
        correctOptionId: 'stop',
      },
      l2: {
        lead: 'Here is why starting over would not help.',
        consequence: {
          caption:
            'Starting over repeats the same comparisons and reaches the same empty range - every half that could hold 18 has already been ruled out.',
          array: [4, 10, 15, 22, 29],
        },
        prompt: 'Once low is past high, what does that prove?',
        options: [
          { id: 'absent', text: 'The target is not in the array' },
          { id: 'unsorted', text: 'The array must be unsorted' },
          { id: 'restart', text: 'The search should be restarted' },
        ],
        correctOptionId: 'absent',
      },
      l3: {
        worked:
          'Worked example: searching [2, 7, 13, 21] for 9: 7 is too small (go right), 13 is too big (go left), and now low is past high. Every place 9 could be has been ruled out, so it is absent. Now try one.',
        repeat: {
          prompt: 'Searching [6, 11, 17, 24, 30] for 25: 17 is too small, 24 is too small, then 30 is too big. What now?',
          array: [6, 11, 17, 24, 30],
          options: [
            { id: 'stop', text: 'Stop - 25 is not in the array' },
            { id: 'left', text: 'Search the left half again' },
            { id: 'restart', text: 'Start over' },
          ],
          correctOptionId: 'stop',
        },
      },
    },
  },

  BOUNDARY_CONDITION: {
    'bubble-sort': {
      l1: {
        prompt: 'In pass 1 on a 5-element array (indices 0 to 4), which is the last pair bubble sort compares?',
        options: [
          { id: 'i3-4', text: 'Indices 3 and 4' },
          { id: 'i4-5', text: 'Indices 4 and 5' },
          { id: 'i2-3', text: 'Indices 2 and 3' },
        ],
        correctOptionId: 'i3-4',
      },
      l2: {
        lead: 'Here is what going one pair too far does.',
        consequence: { caption: 'Comparing indices 4 and 5 would read past the end of a 5-element array - there is no index 5.' },
        prompt: 'In pass 2 on the same 5-element array, which is the last pair compared?',
        options: [
          { id: 'i2-3', text: 'Indices 2 and 3' },
          { id: 'i3-4', text: 'Indices 3 and 4' },
          { id: 'i4-5', text: 'Indices 4 and 5' },
        ],
        correctOptionId: 'i2-3',
      },
      l3: {
        worked:
          'Worked example: on 6 elements (indices 0 to 5), pass 1 compares up to indices 4 and 5; pass 2 stops at 3 and 4, because index 5 already holds the largest value. Now try one.',
        repeat: {
          prompt: 'On 6 elements, which is the last pair compared in pass 3?',
          options: [
            { id: 'i2-3', text: 'Indices 2 and 3' },
            { id: 'i3-4', text: 'Indices 3 and 4' },
            { id: 'i4-5', text: 'Indices 4 and 5' },
          ],
          correctOptionId: 'i2-3',
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Searching [3, 8, 12, 19, 27, 31] with low = 0 and high = 5. What is the middle index?',
        array: [3, 8, 12, 19, 27, 31],
        options: [
          { id: '2', text: '2' },
          { id: '3', text: '3' },
          { id: '2.5', text: '2.5' },
        ],
        correctOptionId: '2',
      },
      l2: {
        lead: 'Here is where the range ends.',
        consequence: { caption: 'With low = 4 and high = 3 the range is empty: the search must stop and report the target missing.' },
        prompt: 'When does binary search stop without finding the target?',
        options: [
          { id: 'low-past-high', text: 'When low becomes greater than high' },
          { id: 'low-equals-high', text: 'When low equals high' },
          { id: 'three', text: 'After three comparisons' },
        ],
        correctOptionId: 'low-past-high',
      },
      l3: {
        worked:
          'Worked example: in [5, 14, 20, 26] with low = 0 and high = 3, the middle index is (0 + 3) / 2 = 1.5, rounded down to 1 (value 14). Now try one.',
        repeat: {
          prompt: 'With low = 2 and high = 7, what is the middle index?',
          options: [
            { id: '4', text: '4' },
            { id: '5', text: '5' },
            { id: '4.5', text: '4.5' },
          ],
          correctOptionId: '4',
        },
      },
    },
  },

  STABILITY_CONFUSION: {
    'bubble-sort': {
      l1: {
        prompt: 'Bubble sort compares two equal neighbours, 8 and 8. What should happen?',
        array: [8, 8],
        highlightIndices: [0, 1],
        ...swapOrLeave('leave'),
      },
      l2: {
        lead: 'Here is what swapping equal values costs.',
        consequence: {
          caption: 'Swapping equal values changes nothing in the numbers, but it can reorder records that share a key - the sort would no longer be stable.',
        },
        prompt: 'Why does bubble sort swap only when the left value is strictly greater?',
        options: [
          { id: 'stable', text: 'So equal values keep their original order' },
          { id: 'faster', text: 'Only to save time' },
          { id: 'cannot', text: 'Because equal values cannot be compared' },
        ],
        correctOptionId: 'stable',
      },
      l3: {
        worked:
          'Worked example: in [6, 6, 2], the first comparison sees 6 and 6 - not strictly greater - so they stay; the second sees 6 and 2 and swaps. The equal values keep their order. Now try one.',
        repeat: {
          prompt: 'Bubble sort compares 5 and 5. What should happen?',
          array: [5, 5],
          highlightIndices: [0, 1],
          ...swapOrLeave('leave'),
        },
      },
    },
  },

  TRAVERSAL_ORDER_CONFUSION: {
    bst: {
      l1: {
        prompt: 'A BST has root 16, left child 9 and right child 25. In what order does an in-order traversal (left, node, right) visit them?',
        options: [
          { id: 'in', text: '9, 16, 25' },
          { id: 'pre', text: '16, 9, 25' },
          { id: 'other', text: '16, 25, 9' },
        ],
        correctOptionId: 'in',
      },
      l2: {
        lead: 'Here is what the other order gives.',
        consequence: { caption: 'Pre-order visits the node first: for root 16 with children 9 and 25 it gives 16, 9, 25 - not sorted.' },
        prompt: 'Which traversal visits the left subtree, then the node, then the right subtree?',
        options: [
          { id: 'in', text: 'In-order' },
          { id: 'pre', text: 'Pre-order' },
          { id: 'level', text: 'Level-order' },
        ],
        correctOptionId: 'in',
      },
      l3: {
        worked:
          'Worked example: root 20, left child 11 (whose left child is 4), right child 33. In-order goes all the way left first: 4, then 11, then 20, then 33 - sorted. Now try one.',
        repeat: {
          prompt: 'Root 38, left child 21, right child 47 (whose left child is 42). What does an in-order traversal give?',
          options: [
            { id: 'in', text: '21, 38, 42, 47' },
            { id: 'pre', text: '38, 21, 47, 42' },
            { id: 'other', text: '21, 38, 47, 42' },
          ],
          correctOptionId: 'in',
        },
      },
    },
  },

  COMPLEXITY_MISATTRIBUTION: {
    'bubble-sort': {
      l1: {
        prompt: 'Bubble sort runs on 6 elements in reverse order, so every pass runs in full. How many comparisons does it make in total?',
        options: [
          { id: '15', text: '15' },
          { id: '6', text: '6' },
          { id: '36', text: '36' },
          { id: '5', text: '5' },
        ],
        correctOptionId: '15',
      },
      l2: {
        lead: 'Complete the trace: pass 1 makes 4 comparisons, pass 2 makes 3, pass 3 makes 2, pass 4 makes 1.',
        consequence: { caption: 'Each pass compares one fewer pair than the one before, because one more value is already in place.' },
        prompt: 'For 5 elements in reverse order, what is the total number of comparisons?',
        options: [
          { id: '10', text: '10' },
          { id: '5', text: '5' },
          { id: '25', text: '25' },
          { id: '4', text: '4' },
        ],
        correctOptionId: '10',
      },
      l3: {
        worked:
          'Worked example: for 7 elements, the passes make 6 + 5 + 4 + 3 + 2 + 1 = 21 comparisons, which is n(n-1)/2 = 7 x 6 / 2. Now try one.',
        repeat: {
          prompt: 'For 8 elements in reverse order, how many comparisons does bubble sort make?',
          options: [
            { id: '28', text: '28' },
            { id: '8', text: '8' },
            { id: '64', text: '64' },
            { id: '7', text: '7' },
          ],
          correctOptionId: '28',
        },
      },
    },
    'binary-search': {
      l1: {
        prompt: 'Binary search on 31 sorted elements: at most how many comparisons does it need?',
        options: [
          { id: '5', text: '5' },
          { id: '31', text: '31' },
          { id: '16', text: '16' },
          { id: '15', text: '15' },
        ],
        correctOptionId: '5',
      },
      l2: {
        lead: 'Complete the trace: each comparison halves the range - 20, then 10, then 5, then 2, then 1.',
        consequence: {
          caption: 'At most half the range survives each comparison, so the count grows with how many times n can be halved, not with n itself.',
        },
        prompt: 'At most how many comparisons for 20 elements?',
        options: [
          { id: '5', text: '5' },
          { id: '20', text: '20' },
          { id: '10', text: '10' },
          { id: '4', text: '4' },
        ],
        correctOptionId: '5',
      },
      l3: {
        worked:
          'Worked example: for 63 elements the range shrinks 63, 31, 15, 7, 3, 1 - at most 6 comparisons, which is floor(log2 63) + 1. Now try one.',
        repeat: {
          prompt: 'At most how many comparisons for 100 elements?',
          options: [
            { id: '7', text: '7' },
            { id: '100', text: '100' },
            { id: '50', text: '50' },
            { id: '10', text: '10' },
          ],
          correctOptionId: '7',
        },
      },
    },
    bst: {
      l1: {
        prompt: 'Inserting 1, 2, 3, 4, 5, in that order, into an empty BST. What shape does the tree take?',
        options: [
          { id: 'chain', text: 'A chain leaning right, one node per level' },
          { id: 'balanced', text: 'A balanced tree about 3 levels deep' },
          { id: 'left-chain', text: 'A chain leaning left' },
        ],
        correctOptionId: 'chain',
      },
      l2: {
        lead: 'Complete the count: each insert compares with one node per level on its way down.',
        consequence: { caption: 'In the chain 1, 2, 3, 4, inserting 5 compares with all 4 nodes.' },
        prompt: 'In total, how many comparisons does inserting 1, 2, 3, 4, 5 into an empty tree make (0 + 1 + 2 + 3 + 4)?',
        options: [
          { id: '10', text: '10' },
          { id: '5', text: '5' },
          { id: '25', text: '25' },
          { id: '4', text: '4' },
        ],
        correctOptionId: '10',
      },
      l3: {
        worked:
          'Worked example: inserting 4, 2, 6, 1, 3, 5, 7 builds a balanced tree 3 levels deep, so no insert compares with more than 2 nodes - far fewer than a chain of 7. Now try one.',
        repeat: {
          prompt: 'Which insert order of 1 to 7 gives the fastest later searches?',
          options: [
            { id: 'balanced', text: '4, 2, 6, 1, 3, 5, 7' },
            { id: 'ascending', text: '1, 2, 3, 4, 5, 6, 7' },
            { id: 'descending', text: '7, 6, 5, 4, 3, 2, 1' },
          ],
          correctOptionId: 'balanced',
        },
      },
    },
  },
}

// OFF_BY_ONE shares the boundary tasks: in both study engines it is the same
// edge-of-range reasoning.
SCENARIOS.OFF_BY_ONE = SCENARIOS.BOUNDARY_CONDITION

/** The pairs with authored content, for tests and coverage checks. */
export function authoredRemediationPairs(): Array<[string, StudyTopicSlug]> {
  return Object.entries(SCENARIOS).flatMap(([category, byTopic]) =>
    Object.keys(byTopic ?? {}).map((topic) => [category, topic as StudyTopicSlug] as [string, StudyTopicSlug]),
  )
}

/** Returns null when this (category, algorithm) pair has no authored
 * content - the caller falls back to the existing bottom-out explanation
 * rather than presenting nothing. Levels above 3 repeat level 3. */
export function generateRemediationTask(category: string, algorithmTopicSlug: string, level: number): RemediationPayload | null {
  const scenario = SCENARIOS[category]?.[algorithmTopicSlug as StudyTopicSlug]
  if (!scenario) return null

  if (level <= 1) {
    const q = scenario.l1
    return { taskType: 'MICRO_PREDICTION', level, scaffold: null, ...q }
  }
  if (level === 2) {
    const { lead, consequence, ...q } = scenario.l2
    return { taskType: getRemediationTaskType(category) ?? 'COUNTEREXAMPLE', level, scaffold: lead, consequence, ...q }
  }
  const { worked, repeat } = scenario.l3
  return { taskType: 'WORKED_EXAMPLE', level, scaffold: worked, ...repeat }
}
