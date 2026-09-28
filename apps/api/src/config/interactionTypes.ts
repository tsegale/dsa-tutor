/**
 * Every Interaction.interactionType value the api accepts. Week 2 adds new
 * kinds of logged activity alongside answered junctions; add each here and
 * decide whether it is scored.
 */
export const INTERACTION_TYPES = ['PREDICTION', 'FEYNMAN', 'WORKED_STEP', 'SELF_EXPLANATION'] as const

export type InteractionType = (typeof INTERACTION_TYPES)[number]

/**
 * The types that are a graded answer to a junction - the only rows
 * accuracy, mastery and prediction counts may include. A worked step is
 * something the learner watched, not answered; counting it (or a Feynman
 * explanation) as a prediction would deflate every accuracy figure.
 */
export const SCORED_INTERACTION_TYPES: readonly InteractionType[] = ['PREDICTION']

export function isScoredInteraction(interaction: { interactionType: string }): boolean {
  return (SCORED_INTERACTION_TYPES as readonly string[]).includes(interaction.interactionType)
}
