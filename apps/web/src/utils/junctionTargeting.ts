import { CriticalJunctionType, MisconceptionCategory } from '@dsa-tutor/types'

/**
 * Maps a misconception category to the junction type(s) that most
 * directly exercise it. When the learner's top recent misconception maps
 * to the junction type about to fire, that junction is forced to fire
 * even when density-based fading (see JunctionDensity in engine/bubbleSort.ts)
 * would otherwise have skipped it - the whole point of fading is to stop
 * asking about things the learner already has, not to skip past their
 * actual weak spot.
 */
export const MISCONCEPTION_TARGET_JUNCTIONS: Partial<Record<MisconceptionCategory, CriticalJunctionType[]>> = {
  [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: [
    CriticalJunctionType.SWAP_DECISION,
    CriticalJunctionType.GAP_COMPARISON,
  ],
  [MisconceptionCategory.ORDER_OF_OPERATIONS]: [CriticalJunctionType.SWAP_DECISION, CriticalJunctionType.GAP_COMPARISON],
  [MisconceptionCategory.COMPARISON_DIRECTION]: [
    CriticalJunctionType.SWAP_DECISION,
    CriticalJunctionType.NEW_MINIMUM,
    CriticalJunctionType.BST_DIRECTION,
    CriticalJunctionType.MIDPOINT_DECISION,
    CriticalJunctionType.PARTITION_DECISION,
    CriticalJunctionType.MERGE_DECISION,
  ],
  [MisconceptionCategory.INVARIANT_MISAPPLICATION]: [
    CriticalJunctionType.HEAP_COMPARE,
    CriticalJunctionType.HEAP_SIFT_UP,
    CriticalJunctionType.HEAP_SIFT_DOWN,
    CriticalJunctionType.EDGE_RELAX,
  ],
  [MisconceptionCategory.OFF_BY_ONE]: [
    CriticalJunctionType.INDEX_ACCESS,
    CriticalJunctionType.INSERT_POSITION,
    CriticalJunctionType.DELETE_SHIFT,
  ],
  [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: [
    CriticalJunctionType.NEXT_NODE_SELECTION,
    CriticalJunctionType.VISIT_NODE,
  ],
  [MisconceptionCategory.PREMATURE_TERMINATION]: [
    CriticalJunctionType.EARLY_TERMINATION,
    CriticalJunctionType.BELLMAN_PASS_COMPLETE,
  ],
  [MisconceptionCategory.POINTER_CONFUSION]: [
    CriticalJunctionType.NULL_CHECK,
    CriticalJunctionType.INSERT_BETWEEN,
    CriticalJunctionType.DELETE_RELINK,
    CriticalJunctionType.POINTER_FOLLOW,
  ],
  [MisconceptionCategory.BASE_CASE_OMISSION]: [CriticalJunctionType.BASE_CASE],
  [MisconceptionCategory.BOUNDARY_CONDITION]: [
    CriticalJunctionType.OVERFLOW_CHECK,
    CriticalJunctionType.UNDERFLOW_CHECK,
    CriticalJunctionType.CIRCULAR_WRAP,
  ],
}

/** The most frequent category in a recency-ordered list of misconception
 * categories from this session's incorrect predictions (most recent
 * last) - the single shared definition of "top misconception" used both
 * for AI Challenge generation and junction targeting, so the two never
 * quietly disagree on what the learner's weak spot is. */
export function topMisconceptionOf(recent: string[]): string | null {
  if (recent.length === 0) return null
  const counts: Record<string, number> = {}
  recent.forEach((category) => {
    counts[category] = (counts[category] ?? 0) + 1
  })
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
}

/** True when `junctionType` is one of the junctions targeted by the
 * learner's top misconception - density gating must not skip it. */
export function shouldForceJunction(
  topMisconception: string | null,
  junctionType: CriticalJunctionType,
): boolean {
  if (!topMisconception) return false
  const targets = MISCONCEPTION_TARGET_JUNCTIONS[topMisconception as MisconceptionCategory]
  return targets?.includes(junctionType) ?? false
}
