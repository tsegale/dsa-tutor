import { prisma } from '../lib/prisma'
import { toCsv, parseCsv } from '../utils/csv'

/** One row per incorrect interaction from a consenting, non-withdrawn
 * participant. Never includes name or email - only participantCode, which
 * is meaningless outside the study's own records. */
export async function exportMisconceptionsCsv(): Promise<string> {
  const interactions = await prisma.interaction.findMany({
    where: {
      predictionCorrect: false,
      session: {
        user: {
          participantCode: { not: null },
          withdrawnAt: null,
        },
      },
    },
    include: {
      session: {
        include: {
          user: { select: { participantCode: true } },
          algorithmTopic: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const header = [
    'interactionId',
    'participantCode',
    'algorithm',
    'junctionType',
    'serialisedState',
    'studentAnswer',
    'ruleLabel',
    'aiLabel',
    'feedbackText',
    'aiGenerated',
  ]

  const rows = interactions.map((interaction) => [
    interaction.id,
    interaction.session.user.participantCode ?? '',
    interaction.session.algorithmTopic.displayName,
    interaction.criticalJunctionType ?? '',
    interaction.dataStructureStateSnapshot ? JSON.stringify(interaction.dataStructureStateSnapshot) : '',
    interaction.predictionSubmitted ?? '',
    interaction.misconceptionCategory ?? '',
    interaction.aiMisconceptionCategory ?? '',
    interaction.feedbackText ?? '',
    String(interaction.aiGenerated),
  ])

  return toCsv(header, rows)
}

/** Imports a rater's CSV (interactionId, raterCode, label) as
 * MisconceptionRating rows. Upserts on (interactionId, raterCode) so
 * re-importing a corrected CSV replaces, rather than duplicates, a
 * rater's earlier labels. */
export async function importMisconceptionRatings(csvText: string): Promise<{ imported: number }> {
  const rows = parseCsv(csvText)
  let imported = 0

  for (const row of rows) {
    const { interactionId, raterCode, label } = row
    if (!interactionId || !raterCode || !label) continue

    await prisma.misconceptionRating.upsert({
      where: { interactionId_raterCode: { interactionId, raterCode } },
      create: { interactionId, raterCode, label },
      update: { label },
    })
    imported++
  }

  return { imported }
}

export interface AgreementRow {
  raterCode: string
  ratingCount: number
  agreementCount: number
  agreementPercent: number
}

/** Percentage agreement between each rater's label and the rule-based
 * ruleLabel already stored on the interaction - deterministic arithmetic,
 * no LLM or statistical library involved. */
export function computeAgreement(
  ratings: Array<{ raterCode: string; label: string; ruleLabel: string | null }>,
): AgreementRow[] {
  const byRater = new Map<string, { total: number; agree: number }>()

  for (const rating of ratings) {
    const bucket = byRater.get(rating.raterCode) ?? { total: 0, agree: 0 }
    bucket.total += 1
    if (rating.ruleLabel !== null && rating.label === rating.ruleLabel) {
      bucket.agree += 1
    }
    byRater.set(rating.raterCode, bucket)
  }

  return [...byRater.entries()]
    .map(([raterCode, { total, agree }]) => ({
      raterCode,
      ratingCount: total,
      agreementCount: agree,
      agreementPercent: total > 0 ? Math.round((agree / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.raterCode.localeCompare(b.raterCode))
}

export function agreementToMarkdownTable(rows: AgreementRow[]): string {
  const header = '| Rater | Ratings | Agreed with rule label | Agreement |'
  const divider = '| --- | --- | --- | --- |'
  const body = rows.map(
    (r) => `| ${r.raterCode} | ${r.ratingCount} | ${r.agreementCount} | ${r.agreementPercent}% |`,
  )
  return [header, divider, ...body].join('\n')
}
