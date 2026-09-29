/**
 * The labels a rater may give an incorrect interaction (Week 3 3D): the
 * misconception taxonomy (packages/types MisconceptionCategory - mirrored
 * here because the api cannot load runtime values from that .ts package;
 * misconceptionTaxonomy.test.ts keeps them identical) plus NONE, for "no
 * misconception applies".
 */
export const MISCONCEPTION_CATEGORIES = [
  'OFF_BY_ONE',
  'ORDER_OF_OPERATIONS',
  'STRUCTURAL_PROPERTY_VIOLATION',
  'POINTER_CONFUSION',
  'BASE_CASE_OMISSION',
  'COMPLEXITY_MISATTRIBUTION',
  'COMPARISON_DIRECTION',
  'INVARIANT_MISAPPLICATION',
  'PREMATURE_TERMINATION',
  'STABILITY_CONFUSION',
  'TRAVERSAL_ORDER_CONFUSION',
  'BOUNDARY_CONDITION',
] as const

export const RATING_LABELS: readonly string[] = [...MISCONCEPTION_CATEGORIES, 'NONE']
