/**
 * Every Interaction.interactionType value the api accepts. Week 2 adds new
 * kinds of logged activity alongside answered junctions; add each here and
 * decide whether it is scored.
 */
export const INTERACTION_TYPES = [
  'PREDICTION',
  'FEYNMAN',
  'WORKED_STEP',
  'SELF_EXPLANATION',
  'COMPLEXITY_PREDICTION',
  // One row per AI Challenge loaded (Week 2 2D): promptKey names the case
  // and seed, misconceptionCategory the targeted category. Not an answer.
  'CHALLENGE_ATTEMPT',
] as const

export type InteractionType = (typeof INTERACTION_TYPES)[number]

/**
 * The types that are a graded answer to a junction - the only rows
 * accuracy, mastery and prediction counts may include. A worked step is
 * something the learner watched, not answered; counting it (or a Feynman
 * explanation) as a prediction would deflate every accuracy figure.
 */
// A complexity prediction is a graded conceptual junction, so it counts.
export const SCORED_INTERACTION_TYPES: readonly InteractionType[] = ['PREDICTION', 'COMPLEXITY_PREDICTION']

export function isScoredInteraction(interaction: { interactionType: string }): boolean {
  return (SCORED_INTERACTION_TYPES as readonly string[]).includes(interaction.interactionType)
}

/**
 * A FEYNMAN row's explanation score, or null if it was not graded. Rows
 * from Week 2 2E on carry promptKey 'feynman.<rubric>' and a nullable
 * rubricScore, where null means reused wording or no judgement - never a 0.
 * Older rows only have masteryScoreAtTime.
 */
export function feynmanScoreOf(row: {
  promptKey: string | null
  rubricScore: number | null
  masteryScoreAtTime: number
}): number | null {
  return row.promptKey?.startsWith('feynman.') ? row.rubricScore : row.masteryScoreAtTime
}
