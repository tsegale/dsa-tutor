import { CriticalJunctionType, MisconceptionCategory } from '@dsa-tutor/types'

// Mirrors apps/api/src/config/studyTopics.ts - the three fully
// instrumented algorithms this whole response loop is scoped to.
export const STUDY_TOPIC_SLUGS = ['bubble-sort', 'binary-search', 'bst'] as const
export type StudyTopicSlug = (typeof STUDY_TOPIC_SLUGS)[number]

// L1 is always a MICRO_PREDICTION and L3 a WORKED_EXAMPLE; a category's own
// remediation type (below) is its level-2 task. SELF_EXPLANATION stays in
// the union only because rows logged before Week 3 carry it.
export type RemediationTaskType = 'MICRO_PREDICTION' | 'TRACE_COMPLETION' | 'COUNTEREXAMPLE' | 'WORKED_EXAMPLE' | 'SELF_EXPLANATION'

interface ProbeMapping {
  probingJunctions: CriticalJunctionType[]
  remediationTaskType: 'TRACE_COMPLETION' | 'COUNTEREXAMPLE'
}

/**
 * For each category the study topics' answer tiles can tag a learner with
 * (apps/web/src/utils/tileBuilder.ts): which junction types probe it - the
 * ones whose tiles can reveal it again - and the level-2 remediation type
 * that addresses it. misconceptionProbes.test.ts derives the produced
 * categories from real runs, so a tile tagged with an unmapped category, or
 * a category with no probing junction that can reveal it, fails the build.
 *
 * OFF_BY_ONE and STABILITY_CONFUSION are not produced by any study tile
 * today (the code-eval path can still label them), so they keep a mapping
 * for completeness.
 */
export const MISCONCEPTION_PROBE_MAP: Partial<Record<MisconceptionCategory, ProbeMapping>> = {
  // Over-swapping: the bubble "Swap them" tile.
  [MisconceptionCategory.ORDER_OF_OPERATIONS]: {
    probingJunctions: [CriticalJunctionType.SWAP_DECISION],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  // Under-swapping ("Leave them"), a BST value in the wrong subtree or an
  // "insert here" at a full node, and ordering read as insertion order.
  [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: {
    probingJunctions: [
      CriticalJunctionType.SWAP_DECISION,
      CriticalJunctionType.BST_DIRECTION,
      CriticalJunctionType.ALGORITHM_COMPLETE,
    ],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.COMPARISON_DIRECTION]: {
    probingJunctions: [
      CriticalJunctionType.SWAP_DECISION,
      CriticalJunctionType.MIDPOINT_DECISION,
      CriticalJunctionType.BST_DIRECTION,
      CriticalJunctionType.PASS_COMPLETE,
    ],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.INVARIANT_MISAPPLICATION]: {
    probingJunctions: [
      CriticalJunctionType.PASS_COMPLETE,
      CriticalJunctionType.EARLY_TERMINATION,
      CriticalJunctionType.ALGORITHM_COMPLETE,
      CriticalJunctionType.BST_DIRECTION,
    ],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.PREMATURE_TERMINATION]: {
    probingJunctions: [
      CriticalJunctionType.PASS_COMPLETE,
      CriticalJunctionType.EARLY_TERMINATION,
      CriticalJunctionType.ALGORITHM_COMPLETE,
    ],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  [MisconceptionCategory.BOUNDARY_CONDITION]: {
    probingJunctions: [CriticalJunctionType.MIDPOINT_DECISION, CriticalJunctionType.ALGORITHM_COMPLETE],
    remediationTaskType: 'TRACE_COMPLETION',
  },
  [MisconceptionCategory.OFF_BY_ONE]: {
    probingJunctions: [CriticalJunctionType.MIDPOINT_DECISION],
    remediationTaskType: 'TRACE_COMPLETION',
  },
  [MisconceptionCategory.STABILITY_CONFUSION]: {
    probingJunctions: [CriticalJunctionType.SWAP_DECISION],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  // The BST completion question (pre-order and level-order tiles).
  [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: {
    probingJunctions: [CriticalJunctionType.ALGORITHM_COMPLETE],
    remediationTaskType: 'COUNTEREXAMPLE',
  },
  // The count question (Week 2 2C) and the complexity-flavoured completion
  // and pass tiles.
  [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: {
    probingJunctions: [
      CriticalJunctionType.COMPLEXITY_PREDICTION,
      CriticalJunctionType.PASS_COMPLETE,
      CriticalJunctionType.ALGORITHM_COMPLETE,
    ],
    remediationTaskType: 'TRACE_COMPLETION',
  },
}

export const COVERED_MISCONCEPTION_CATEGORIES = Object.keys(MISCONCEPTION_PROBE_MAP) as MisconceptionCategory[]

// Never show the internal category string to a student - the algorithm
// page's open-event indicator names the concept in plain language instead.
const STUDENT_LANGUAGE_LABELS: Partial<Record<MisconceptionCategory, string>> = {
  [MisconceptionCategory.ORDER_OF_OPERATIONS]: 'when to leave a pair alone',
  [MisconceptionCategory.COMPARISON_DIRECTION]: 'which way a comparison goes',
  [MisconceptionCategory.INVARIANT_MISAPPLICATION]: "what's guaranteed after a pass",
  [MisconceptionCategory.PREMATURE_TERMINATION]: 'when it’s safe to stop early',
  [MisconceptionCategory.BOUNDARY_CONDITION]: 'the edges of the search range',
  [MisconceptionCategory.OFF_BY_ONE]: 'the edges of the search range',
  [MisconceptionCategory.STABILITY_CONFUSION]: 'equal values during a swap',
  [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'which side a value belongs on',
  [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: 'which node to visit next',
  [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 'how many comparisons this takes',
}

// Where the default wording is written from one topic's point of view and
// would mislead on another (a "pass" on binary search, say).
const TOPIC_LABELS: Record<string, Partial<Record<MisconceptionCategory, string>>> = {
  'bubble-sort': {
    [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'when a pair is out of order',
  },
  'binary-search': {
    [MisconceptionCategory.INVARIANT_MISAPPLICATION]: 'what stays true about the search range',
    [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'why the array must already be sorted',
  },
  bst: {
    [MisconceptionCategory.INVARIANT_MISAPPLICATION]: "what the tree's ordering guarantees",
  },
}

export function getStudentLanguageLabel(category: string, topicSlug?: string): string {
  const byTopic = topicSlug ? TOPIC_LABELS[topicSlug]?.[category as MisconceptionCategory] : undefined
  return byTopic ?? STUDENT_LANGUAGE_LABELS[category as MisconceptionCategory] ?? 'a recent question'
}

export function getProbingJunctions(category: string): CriticalJunctionType[] {
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
