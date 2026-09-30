// XP is derived on the server from what was recorded (Week 4 4D.5). The
// client never names an amount: it used to POST /auth/xp with whatever it
// liked, and the model used to be asked for an xp_awarded field it could get
// wrong. Every award now follows from a row the server wrote itself.

export const XP = {
  CORRECT_PREDICTION: 10,
  FEYNMAN_BASE: 30,
  FEYNMAN_COMPLETE_BONUS: 20,
  // Awarded when a challenge is created (its CHALLENGE_ATTEMPT row), which the
  // per-session challenge limit already caps. There is no server record of a
  // challenge run finishing to award a completion bonus from.
  CHALLENGE: 10,
  BADGE: 50,
} as const

interface AwardableInteraction {
  /** Omitted by older callers; the column defaults to PREDICTION. */
  interactionType?: string | null
  predictionCorrect?: boolean | null
}

/** XP earned by one logged interaction. Code Mode answers are PREDICTION rows too. */
export function xpForInteraction(interaction: AwardableInteraction): number {
  const type = interaction.interactionType ?? 'PREDICTION'
  switch (type) {
    case 'PREDICTION':
    case 'COMPLEXITY_PREDICTION':
      return interaction.predictionCorrect === true ? XP.CORRECT_PREDICTION : 0
    case 'FEYNMAN':
      return XP.FEYNMAN_BASE + (interaction.predictionCorrect === true ? XP.FEYNMAN_COMPLETE_BONUS : 0)
    case 'CHALLENGE_ATTEMPT':
      return XP.CHALLENGE
    default:
      return 0
  }
}
