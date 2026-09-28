/**
 * Known windows of invalid research data, recorded in code so they are not
 * left to memory. The 12D.7 purge must delete every row these mark.
 *
 * Before prompt 2026-09-28.6 (commit b6e241f, 2026-09-28) the feedback model
 * saw only the tile id (e.g. "wrong-2") at junctions whose tiles use generic
 * ids, so its feedback described an answer the student may not have chosen.
 * Rows with a null promptVersion predate versioning and are pilot data by
 * definition (CLAUDE.md), so they are marked too.
 */
export const FEEDBACK_SEES_CHOSEN_OPTION_FROM = '2026-09-28.6'

/** Orders prompt versions ("YYYY-MM-DD.N"); a plain string compare would put .10 before .9. */
export function comparePromptVersions(a: string, b: string): number {
  const [dateA, seqA = '0'] = a.split('.')
  const [dateB, seqB = '0'] = b.split('.')
  if (dateA !== dateB) return dateA < dateB ? -1 : 1
  return Number(seqA) - Number(seqB)
}

/** True for a row whose displayed feedback was written before the model could see the chosen option. */
export function hasPreLabelFixFeedback(row: { feedbackText: string | null; promptVersion: string | null }): boolean {
  if (row.feedbackText === null) return false
  return row.promptVersion === null || comparePromptVersions(row.promptVersion, FEEDBACK_SEES_CHOSEN_OPTION_FROM) < 0
}
