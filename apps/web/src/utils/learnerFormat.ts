// Formatting for the profile's analytics (Phase 6C).

/** "4h 12m", "12m", "0m". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

/**
 * A session's mode in sentence case. A participant's Classic sessions show as
 * "Practice": naming Classic would tell them which topic is their control,
 * which the study design must never reveal.
 */
export function sessionModeLabel(mode: string): string {
  switch (mode) {
    case 'DEMO':
      return 'Demo'
    case 'HANDS_ON':
      return 'Hands-On'
    case 'PRACTICE':
    case 'CLASSIC':
      return 'Practice'
    default:
      return mode.charAt(0) + mode.slice(1).toLowerCase().replace(/_/g, ' ')
  }
}

/** Misconception categories in plain language, never their enum names. */
const MISCONCEPTION_NAMES: Record<string, string> = {
  OFF_BY_ONE: 'Off-by-one indexing',
  ORDER_OF_OPERATIONS: 'Steps in the wrong order',
  STRUCTURAL_PROPERTY_VIOLATION: 'Breaking the structure’s rules',
  POINTER_CONFUSION: 'Mixing up a pointer and its value',
  BASE_CASE_OMISSION: 'Missing the base case',
  COMPLEXITY_MISATTRIBUTION: 'Wrong time or space cost',
  COMPARISON_DIRECTION: 'Comparing the wrong way round',
  INVARIANT_MISAPPLICATION: 'Misapplying what must stay true',
  PREMATURE_TERMINATION: 'Stopping too early',
  STABILITY_CONFUSION: 'Confusing stable and unstable order',
  TRAVERSAL_ORDER_CONFUSION: 'Visiting nodes in the wrong order',
  BOUNDARY_CONDITION: 'Edge cases at the boundaries',
  SWAP_DECISION: 'Deciding when to swap',
  PASS_COMPLETE: 'Knowing when a pass is done',
  EARLY_TERMINATION: 'Knowing when to stop early',
  ALGORITHM_COMPLETE: 'Knowing when the algorithm is done',
  COMPLEXITY_PREDICTION: 'Predicting the cost',
}

export function misconceptionName(category: string): string {
  return MISCONCEPTION_NAMES[category] ?? category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' ')
}
