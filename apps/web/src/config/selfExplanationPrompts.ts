import { CriticalJunctionType, JunctionDifficulty, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { PSEUDOCODE_LINE as BST_LINE } from '@/engine/bst'

/**
 * Authored self-explanation prompts (Week 2 2B), one per conceptual
 * junction per study topic. Authored, never generated, so every participant
 * gets the same question - the AI only grades the answer against the
 * rubric sent with it. Changing a question or criterion changes what is
 * measured: treat edits like a study prompt change (freeze at end of Week 4).
 */
export interface SelfExplanationPrompt {
  /** Stable id stored on every logged response (Interaction.promptKey). */
  key: string
  question: string
  rubric: Array<{ id: string; criterion: string }>
}

const PROMPTS = {
  bubblePassComplete: {
    key: 'bubble-sort.pass-complete',
    question: 'Why is the largest unsorted element now guaranteed to be in its final position?',
    rubric: [
      { id: 'carried_right', criterion: 'each comparison moves the larger of the two values to the right, so the largest value is carried along' },
      { id: 'never_left_behind', criterion: 'the largest value can never be passed or left behind, so it ends at the last unsorted position' },
      { id: 'not_revisited', criterion: 'later passes stop before that position, so it is never moved again' },
    ],
  },
  bubbleEarlyTermination: {
    key: 'bubble-sort.early-termination',
    question: 'Why can the algorithm stop as soon as a pass makes no swaps?',
    rubric: [
      { id: 'pairs_in_order', criterion: 'no swap means every adjacent pair is already in order' },
      { id: 'implies_sorted', criterion: 'if every adjacent pair is in order, the whole array is sorted' },
      { id: 'nothing_to_change', criterion: 'another pass would find nothing to change' },
    ],
  },
  bubbleAlgorithmComplete: {
    key: 'bubble-sort.algorithm-complete',
    question: 'Why does Bubble Sort need at most n-1 passes to sort n elements?',
    rubric: [
      { id: 'one_per_pass', criterion: 'each pass fixes at least one more element in its final place' },
      { id: 'last_one_free', criterion: 'once n-1 elements are in place, the last one must be in place too' },
    ],
  },
  binarySearchComplete: {
    key: 'binary-search.algorithm-complete',
    question: 'Why was it safe to throw away half of the remaining range after each comparison?',
    rubric: [
      { id: 'sorted', criterion: 'the array is sorted' },
      { id: 'middle_tells_side', criterion: 'comparing the target with the middle element shows which side it must be on, if it is there at all' },
      { id: 'discarded_cannot_hold', criterion: 'the discarded half cannot contain the target' },
    ],
  },
  bstDeleteTwoChildren: {
    key: 'bst.delete-two-children',
    question: 'Why is the in-order successor a safe replacement for a node with two children?',
    rubric: [
      { id: 'smallest_right', criterion: 'the successor is the smallest value in the right subtree' },
      { id: 'order_holds', criterion: 'it is larger than everything on the left and smaller than the rest of the right, so the ordering rule still holds' },
      { id: 'easy_to_remove', criterion: 'the successor has no left child, so removing it from its old place is simple' },
    ],
  },
  bstDeleteSimple: {
    key: 'bst.delete-simple',
    question: 'Why can a node with at most one child be removed just by linking its child to its parent?',
    rubric: [
      { id: 'subtree_side', criterion: "the child's whole subtree was already on the correct side of the parent" },
      { id: 'order_holds', criterion: 'the ordering rule still holds after the link, so no other node has to move' },
    ],
  },
} satisfies Record<string, SelfExplanationPrompt>

export const ALL_SELF_EXPLANATION_PROMPTS: readonly SelfExplanationPrompt[] = Object.values(PROMPTS)

/**
 * The prompt for a conceptual junction on a study topic, or null when there
 * is none (a procedural junction, or a topic without authored prompts).
 */
export function selfExplanationPromptFor(
  topicSlug: string | undefined,
  snapshot: AlgorithmSnapshot,
): SelfExplanationPrompt | null {
  if (snapshot.junctionDifficulty !== JunctionDifficulty.CONCEPTUAL) return null
  const type = snapshot.criticalJunctionType
  switch (topicSlug) {
    case 'bubble-sort':
      if (type === CriticalJunctionType.PASS_COMPLETE) return PROMPTS.bubblePassComplete
      if (type === CriticalJunctionType.EARLY_TERMINATION) return PROMPTS.bubbleEarlyTermination
      if (type === CriticalJunctionType.ALGORITHM_COMPLETE) return PROMPTS.bubbleAlgorithmComplete
      return null
    case 'binary-search':
      return type === CriticalJunctionType.ALGORITHM_COMPLETE ? PROMPTS.binarySearchComplete : null
    case 'bst':
      // Both BST conceptual junctions are delete decisions; the pseudocode
      // line says which case the learner just reasoned about.
      if (snapshot.pseudocodeLine === BST_LINE.DELETE_SUCCESSOR) return PROMPTS.bstDeleteTwoChildren
      if (snapshot.pseudocodeLine === BST_LINE.DELETE_SIMPLE) return PROMPTS.bstDeleteSimple
      return null
    default:
      return null
  }
}
