import { CriticalJunctionType, MisconceptionCategory } from '@dsa-tutor/types'

// Mirrors apps/api/src/config/studyTopics.ts - the three fully
// instrumented algorithms this whole response loop is scoped to.
export const STUDY_TOPIC_SLUGS = ['bubble-sort', 'binary-search', 'bst'] as const
export type StudyTopicSlug = (typeof STUDY_TOPIC_SLUGS)[number]

export type RemediationTaskType = 'MICRO_PREDICTION' | 'TRACE_COMPLETION' | 'COUNTEREXAMPLE' | 'SELF_EXPLANATION'

// A synthetic probe identifier for the one category (COMPLEXITY_MISATTRIBUTION)
// whose probe is not a canvas critical junction at all - ComplexityPanel's
// own comparison-count prediction. Not a CriticalJunctionType value.
export const COMPLEXITY_PREDICTION_PROBE = 'COMPLEXITY_PREDICTION' as const

interface ProbeMapping {
  probingJunctions: Array<CriticalJunctionType | typeof COMPLEXITY_PREDICTION_PROBE>
  remediationTaskType: RemediationTaskType
}

// Only the categories that have a probing junction reachable from one of
// the three study-scope algorithms - ORDER_OF_OPERATIONS, POINTER_CONFUSION
// and BASE_CASE_OMISSION belong to algorithms (linked lists, recursion)
// outside STUDY_TOPICS, so they are deliberately not covered here.
//
// TRAVERSAL_ORDER_CONFUSION's junctions (NEXT_NODE_SELECTION, VISIT_NODE)
// are not currently emitted by apps/web/src/engine/bst.ts, which only ever
// produces BST_DIRECTION - they belong to the separate tree-traversal
// topics, which are not in STUDY_TOPICS. The mapping is kept (matching the
// coverage test's "every category has a response path" requirement) but is
// dormant in practice for the current bst engine; it would activate if a
// traversal topic were ever added to STUDY_TOPICS.
export const MISCONCEPTION_PROBE_MAP: Partial<Record<MisconceptionCategory, ProbeMapping>> = {
  [MisconceptionCategory.COMPARISON_DIRECTION]: {
    probingJunctions: [CriticalJunctionType.SWAP_DECISION, CriticalJunctionType.MIDPOINT_DECISION],
    remediationTaskType: 'MICRO_PREDICTION',
  },
  [MisconceptionCategory.INVARIANT_MISAPPLICATION]: {
    probingJunctions: [CriticalJunctionType.PASS_COMPLETE, CriticalJunctionType.ALGORITHM_COMPLETE],
    remediationTaskType: 'SELF_EXPLANATION',
  },
  [MisconceptionCategory.PREMATURE_TERMINATION]: {
    probingJunctions: [CriticalJunctionType.EARLY_TERMINATION],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.BOUNDARY_CONDITION]: {
    probingJunctions: [CriticalJunctionType.MIDPOINT_DECISION],
    remediationTaskType: 'TRACE_COMPLETION',
  },
  [MisconceptionCategory.OFF_BY_ONE]: {
    probingJunctions: [CriticalJunctionType.MIDPOINT_DECISION],
    remediationTaskType: 'TRACE_COMPLETION',
  },
  [MisconceptionCategory.STABILITY_CONFUSION]: {
    probingJunctions: [CriticalJunctionType.SWAP_DECISION],
    remediationTaskType: 'MICRO_PREDICTION',
  },
  [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: {
    // SWAP_DECISION is included alongside BST_DIRECTION: bubble sort's own
    // "leave them" distractor tile (see PredictionZone.tsx's SWAP_DECISION
    // case) is tagged with this exact category too, for the same reason -
    // leaving two out-of-order elements untouched violates the sortedness
    // property the algorithm is meant to guarantee, whichever data
    // structure the mistake happens in. Caught by live-testing this loop:
    // without this, that real, common tile answer created an event with
    // no reachable probe or remediation for bubble sort.
    probingJunctions: [CriticalJunctionType.BST_DIRECTION, CriticalJunctionType.SWAP_DECISION],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: {
    probingJunctions: [CriticalJunctionType.NEXT_NODE_SELECTION, CriticalJunctionType.VISIT_NODE],
    remediationTaskType: 'TRACE_COMPLETION',
  },
  // ComplexityPanel's own comparison-count predictions are a separate
  // feature with no interaction/junction record today, so this category is
  // mapped for coverage but has no live probe wiring in this pass (see the
  // misconception state machine's own notes).
  [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: {
    probingJunctions: [COMPLEXITY_PREDICTION_PROBE],
    remediationTaskType: 'MICRO_PREDICTION',
  },
}

export const COVERED_MISCONCEPTION_CATEGORIES = Object.keys(MISCONCEPTION_PROBE_MAP) as MisconceptionCategory[]

// Never show the internal category string to a student - the algorithm
// page's open-event indicator names the concept in plain language instead.
const STUDENT_LANGUAGE_LABELS: Partial<Record<MisconceptionCategory, string>> = {
  [MisconceptionCategory.COMPARISON_DIRECTION]: 'when to swap',
  [MisconceptionCategory.INVARIANT_MISAPPLICATION]: "what's guaranteed after a pass",
  [MisconceptionCategory.PREMATURE_TERMINATION]: 'when it’s safe to stop early',
  [MisconceptionCategory.BOUNDARY_CONDITION]: 'the edges of the search range',
  [MisconceptionCategory.OFF_BY_ONE]: 'the edges of the search range',
  [MisconceptionCategory.STABILITY_CONFUSION]: 'equal values during a swap',
  [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'which side a value belongs on',
  [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: 'which node to visit next',
  [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 'how many comparisons this takes',
}

export function getStudentLanguageLabel(category: string): string {
  return STUDENT_LANGUAGE_LABELS[category as MisconceptionCategory] ?? 'a recent question'
}

export function getProbingJunctions(
  category: string,
): Array<CriticalJunctionType | typeof COMPLEXITY_PREDICTION_PROBE> {
  return MISCONCEPTION_PROBE_MAP[category as MisconceptionCategory]?.probingJunctions ?? []
}

export function getRemediationTaskType(category: string): RemediationTaskType | null {
  return MISCONCEPTION_PROBE_MAP[category as MisconceptionCategory]?.remediationTaskType ?? null
}

// The resolve rule needs how many tiles a junction actually presents (see
// PredictionZone.tsx's getTilesForSnapshot), so it knows whether one clean
// correct probe is enough or two consecutive ones are required. Read
// statically here rather than threaded live through the component tree -
// these counts are fixed by the tile-generation code for each junction
// type, not per-instance.
const JUNCTION_OPTION_COUNTS: Partial<Record<CriticalJunctionType, number>> = {
  [CriticalJunctionType.SWAP_DECISION]: 2,
  [CriticalJunctionType.PASS_COMPLETE]: 4,
  [CriticalJunctionType.EARLY_TERMINATION]: 4,
  [CriticalJunctionType.ALGORITHM_COMPLETE]: 4,
  [CriticalJunctionType.MIDPOINT_DECISION]: 3,
  [CriticalJunctionType.BST_DIRECTION]: 3,
}

export function getJunctionOptionCount(junctionType: string): number {
  return JUNCTION_OPTION_COUNTS[junctionType as CriticalJunctionType] ?? 2
}

export function isProbingJunction(category: string, junctionType: string): boolean {
  return getProbingJunctions(category).some((j) => j === junctionType)
}
