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
