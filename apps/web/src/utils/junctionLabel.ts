/**
 * A readable name for a CriticalJunctionType, for educator-facing views
 * that group answers by the question asked.
 *
 * Most enum names read well in sentence case ("SWAP_DECISION" -> "Swap
 * decision"); the ones listed here do not, or have a clearer everyday
 * name.
 */
const NAMES: Record<string, string> = {
  PASS_COMPLETE: 'End of a pass',
  EARLY_TERMINATION: 'Stopping early',
  ALGORITHM_COMPLETE: 'Finished',
  COMPLEXITY_PREDICTION: 'Predicting the cost',
  MIDPOINT_DECISION: 'Which half to keep',
  BST_DIRECTION: 'Left or right',
  GRID_NEXT_CELL: 'Next cell to explore',
  HEAP_EXTRACT: 'Extracting the root',
  DIGIT_BUCKET: 'Choosing a bucket',
  DP_CELL: 'Filling a table cell',
  PRUNE_BRANCH: 'Pruning a branch',
  GREEDY_CHOICE: 'Greedy choice',
  RETURN_VALUE: 'What the call returns',
  CALL_COUNT: 'How many calls',
}

export const OTHER_STEPS_LABEL = 'Other steps'

export function junctionLabel(type: string | null | undefined): string {
  if (!type) return OTHER_STEPS_LABEL
  if (NAMES[type]) return NAMES[type]
  const words = type.toLowerCase().split('_').filter(Boolean)
  if (words.length === 0) return OTHER_STEPS_LABEL
  const sentence = words.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
