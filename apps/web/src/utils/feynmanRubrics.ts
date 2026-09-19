/**
 * Display names (as used in useAlgorithmStore's algorithmName / the
 * registry's displayName) for algorithms that have a real, dedicated
 * Feynman rubric on the AI service (see apps/ai/routers/feynman.py's
 * FEYNMAN_RUBRIC). Grading against the generic three-item fallback rubric
 * would produce scores that aren't comparable across topics, so Feynman
 * Mode is restricted to this set rather than silently falling back.
 *
 * Keep in sync with FEYNMAN_RUBRIC's keys in apps/ai/routers/feynman.py -
 * each key there is this name lowercased with spaces/hyphens replaced by
 * underscores and apostrophes stripped.
 */
export const FEYNMAN_RUBRIC_ALGORITHMS: ReadonlySet<string> = new Set([
  'Bubble Sort',
  'Selection Sort',
  'Insertion Sort',
  'Merge Sort',
  'Quick Sort',
  'Linear Search',
  'Binary Search',
  'Breadth-First Search',
  'Depth-First Search',
  'Binary Search Tree',
])

export function hasFeynmanRubric(algorithmName: string): boolean {
  return FEYNMAN_RUBRIC_ALGORITHMS.has(algorithmName)
}
