// The three fully instrumented algorithms used for the honours study.
// Referenced by the assessment module (to decide when a post-test unlocks)
// and by the study curriculum gate (Phase 11E) - defined once here so both
// stay in sync instead of maintaining two separate lists.
export const STUDY_TOPICS = ['bubble-sort', 'binary-search', 'bst'] as const

export type StudyTopicSlug = (typeof STUDY_TOPICS)[number]
