import { prisma } from '../lib/prisma'
import { toCsv, parseCsv } from '../utils/csv'

// Applied to every research export: a row only exists for a consenting,
// still-enrolled participant. Withdrawal must exclude a participant from
// every export, not just the ones written after the withdrawal feature
// existed.
const ACTIVE_PARTICIPANT_FILTER = { participantCode: { not: null as string | null }, withdrawnAt: null }

/** One row per incorrect interaction from a consenting, non-withdrawn
 * participant. Never includes name or email - only participantCode, which
 * is meaningless outside the study's own records. */
export async function exportMisconceptionsCsv(): Promise<string> {
  const interactions = await prisma.interaction.findMany({
    where: {
      predictionCorrect: false,
      session: {
        user: ACTIVE_PARTICIPANT_FILTER,
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

/** One row per interaction (correct and incorrect both - "correct" is
 * itself a column) from a consenting, non-withdrawn participant. */
export async function exportInteractionsCsv(): Promise<string> {
  const interactions = await prisma.interaction.findMany({
    where: { session: { user: ACTIVE_PARTICIPANT_FILTER } },
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
    'participantCode',
    'algorithm',
    'junctionType',
    'correct',
    'ruleLabel',
    'aiLabel',
    'hintsRequested',
    'hintIndexAtResolve',
    'bottomedOut',
    'scaffoldingLevelAtTime',
    'masteryScoreAtTime',
    'timeSpentSeconds',
    'aiGenerated',
    'aiLatencyMs',
  ]

  const rows = interactions.map((interaction) => [
    interaction.session.user.participantCode ?? '',
    interaction.session.algorithmTopic.displayName,
    interaction.criticalJunctionType ?? '',
    String(interaction.predictionCorrect ?? ''),
    interaction.misconceptionCategory ?? '',
    interaction.aiMisconceptionCategory ?? '',
    String(interaction.hintsRequested),
    String(interaction.hintIndexAtResolve),
    String(interaction.bottomedOut),
    interaction.scaffoldingLevelAtTime,
    String(interaction.masteryScoreAtTime),
    String(interaction.timeSpentSeconds),
    String(interaction.aiGenerated),
    interaction.aiLatencyMs !== null ? String(interaction.aiLatencyMs) : '',
  ])

  return toCsv(header, rows)
}

/** One row per assessment response (pre and post test items both) from a
 * consenting, non-withdrawn participant. */
export async function exportAssessmentsCsv(): Promise<string> {
  const responses = await prisma.assessmentResponse.findMany({
    where: { attempt: { user: ACTIVE_PARTICIPANT_FILTER } },
    include: {
      attempt: {
        include: {
          user: { select: { participantCode: true } },
          assessment: { select: { phase: true } },
        },
      },
      item: { select: { conceptTag: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  const header = ['participantCode', 'phase', 'conceptTag', 'score']

  const rows = responses.map((response) => [
    response.attempt.user.participantCode ?? '',
    response.attempt.assessment.phase,
    response.item.conceptTag,
    response.score !== null ? String(response.score) : '',
  ])

  return toCsv(header, rows)
}

/** One row per session from a consenting, non-withdrawn participant.
 * duration is in seconds, blank if the session was never ended. */
export async function exportSessionsCsv(): Promise<string> {
  const sessions = await prisma.session.findMany({
    where: { user: ACTIVE_PARTICIPANT_FILTER },
    include: {
      user: { select: { participantCode: true } },
      algorithmTopic: { select: { displayName: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  const header = ['participantCode', 'algorithm', 'mode', 'durationSeconds', 'mentalEffort', 'confidence']

  const rows = sessions.map((session) => {
    const durationSeconds = session.endTime
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : null
    return [
      session.user.participantCode ?? '',
      session.algorithmTopic.displayName,
      session.mode,
      durationSeconds !== null ? String(durationSeconds) : '',
      session.mentalEffort !== null ? String(session.mentalEffort) : '',
      session.confidence !== null ? String(session.confidence) : '',
    ]
  })

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
