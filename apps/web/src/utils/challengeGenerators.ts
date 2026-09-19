/**
 * Display names for algorithms with a real, deterministic AI Challenge
 * array generator on the AI service (see SUPPORTED_ALGORITHMS in
 * apps/ai/routers/challenges.py). A plain integer array is meaningless
 * for a tree, graph or trie topic, and ChallengeGenerator always loads
 * its result as Bubble Sort regardless of the algorithm currently open -
 * AI Challenge is hidden everywhere else rather than silently switching
 * the student to a different algorithm than the one they were viewing.
 */
export const CHALLENGE_GENERATOR_ALGORITHMS: ReadonlySet<string> = new Set(['Bubble Sort'])

export function hasChallengeGenerator(algorithmName: string): boolean {
  return CHALLENGE_GENERATOR_ALGORITHMS.has(algorithmName)
}
