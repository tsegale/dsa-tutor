import { SCORED_INTERACTION_TYPES } from '../config/interactionTypes'
import { conditionOfSession, isTopicComplete } from '../config/topicCompletion'
import { conditionFor } from '../config/studyCondition'
import { hasPreLabelFixFeedback } from '../config/dataValidity'
import { prisma } from '../lib/prisma'
import { toCsv, parseCsv } from '../utils/csv'
import { ACTIVE_PARTICIPANT_WHERE } from './study.service'
import { STUDY_TOPICS } from '../config/studyTopics'

// Applied to every research export: a row only exists for a consenting,
// still-enrolled, non-withdrawn participant - the same definition used to
// gate topic access (study.service.ts's isActiveParticipant), so a user who
// can't see the study topics can't appear in a study export either.
// PILOT- codes are dry-run data, excluded by default so a rehearsal never
// contaminates the real dataset; includePilot=true opts back in to check
// the pilot export itself.
export function participantWhere(includePilot: boolean) {
  if (includePilot) return ACTIVE_PARTICIPANT_WHERE
  return { ...ACTIVE_PARTICIPANT_WHERE, NOT: { participantCode: { startsWith: 'PILOT-' } } }
}

const STUDY_TOPIC_FILTER = { name: { in: [...STUDY_TOPICS] } }

/** Only data recorded after the participant consented is study data. An
 * account can practise before enrolling (and did, 2026-09-29: the first
 * pilot account carried a week of pre-consent testing), and exporting that
 * would be data collected without consent. */
export function isAfterConsent(at: Date, consentAt: Date | null): boolean {
  return consentAt !== null && at.getTime() >= consentAt.getTime()
}

/** One row per incorrect interaction from an active study participant, on
 * a study topic only. Never includes name or email - only participantCode,
 * which is meaningless outside the study's own records. */
export async function exportMisconceptionsCsv(includePilot = false): Promise<string> {
  const interactions = await prisma.interaction.findMany({
    where: {
      predictionCorrect: false,
      session: {
        user: participantWhere(includePilot),
        algorithmTopic: STUDY_TOPIC_FILTER,
      },
    },
    include: {
      session: {
        include: {
          user: { select: { participantCode: true, consentAt: true, classicTopicSlug: true } },
          algorithmTopic: { select: { displayName: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  }).then((rows) => rows.filter((row) => isAfterConsent(row.createdAt, row.session.user.consentAt)))

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
 * itself a column) from an active study participant, on a study topic
 * only. */
export async function exportInteractionsCsv(includePilot = false): Promise<string> {
  const interactions = await prisma.interaction.findMany({
    where: { session: { user: participantWhere(includePilot), algorithmTopic: STUDY_TOPIC_FILTER } },
    include: {
      session: {
        include: {
          user: { select: { participantCode: true, consentAt: true, classicTopicSlug: true } },
          algorithmTopic: { select: { displayName: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  }).then((rows) => rows.filter((row) => isAfterConsent(row.createdAt, row.session.user.consentAt)))

  const header = [
    'participantCode',
    'algorithm',
    'interactionType',
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
    'aiFailureReason',
    'aiLatencyMs',
    'promptVersion',
    'promptKey',
    'rubricScore',
    'rubricResults',
    // True where the feedback shown was written before the model could see
    // the option the student chose (see config/dataValidity.ts). The 12D.7
    // purge deletes these; until then, exclude them from any analysis.
    'feedbackPreLabelFix',
    // Within-subject condition (Week 3 3B): the participant's Classic topic,
    // and whether this row's topic was it, so gains split without a join.
    'classicTopicSlug',
    'condition',
  ]

  const rows = interactions.map((interaction) => [
    interaction.session.user.participantCode ?? '',
    interaction.session.algorithmTopic.displayName,
    interaction.interactionType,
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
    interaction.aiFailureReason ?? '',
    interaction.aiLatencyMs !== null ? String(interaction.aiLatencyMs) : '',
    interaction.promptVersion ?? '',
    interaction.promptKey ?? '',
    interaction.rubricScore !== null ? String(interaction.rubricScore) : '',
    interaction.rubricResults !== null ? JSON.stringify(interaction.rubricResults) : '',
    String(hasPreLabelFixFeedback(interaction)),
    interaction.session.user.classicTopicSlug ?? '',
    conditionFor(interaction.session.algorithmTopic.name, interaction.session.user.classicTopicSlug),
  ])

  return toCsv(header, rows)
}

/** One row per assessment response (pre and post test items both) from an
 * active study participant. Assessments aren't scoped to an AlgorithmTopic,
 * so there is no STUDY_TOPICS filter to apply here - only the participant
 * and pilot filters. */
export async function exportAssessmentsCsv(includePilot = false): Promise<string> {
  const responses = await prisma.assessmentResponse.findMany({
    where: { attempt: { user: participantWhere(includePilot) } },
    include: {
      attempt: {
        include: {
          user: { select: { participantCode: true, classicTopicSlug: true } },
          assessment: { select: { phase: true } },
        },
      },
      item: { select: { conceptTag: true, topicSlug: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  // topicSlug and condition: the item's study topic, and whether that was
  // this participant's Classic topic - pre/post gains split by condition.
  const header = ['participantCode', 'phase', 'conceptTag', 'score', 'topicSlug', 'classicTopicSlug', 'condition']

  const rows = responses.map((response) => [
    response.attempt.user.participantCode ?? '',
    response.attempt.assessment.phase,
    response.item.conceptTag,
    response.score !== null ? String(response.score) : '',
    response.item.topicSlug ?? '',
    response.attempt.user.classicTopicSlug ?? '',
    response.item.topicSlug ? conditionFor(response.item.topicSlug, response.attempt.user.classicTopicSlug) : '',
  ])

  return toCsv(header, rows)
}

/** One row per session from an active study participant, on a study topic
 * only. duration is in seconds, blank if the session was never ended.
 * wallClockSeconds/activeSeconds (Week 2 2F) come from the client's timing
 * heartbeat, so they survive a closed tab that never sent endTime; active
 * time excludes time the tab was hidden. Blank before 2F. */
export async function exportSessionsCsv(includePilot = false): Promise<string> {
  const sessions = await prisma.session.findMany({
    where: { user: participantWhere(includePilot), algorithmTopic: STUDY_TOPIC_FILTER },
    include: {
      user: {
        select: {
          participantCode: true,
          susScore: true,
          consentAt: true,
          posttestOverrideAt: true,
          posttestOverrideIncompleteTopics: true,
          classicTopicSlug: true,
        },
      },
      algorithmTopic: { select: { displayName: true, name: true } },
      // Graded conceptual answers in this session - the second
      // topic-completion signal (config/topicCompletion.ts).
      _count: {
        select: {
          interactions: {
            where: {
              junctionDifficulty: 'CONCEPTUAL',
              interactionType: { in: [...SCORED_INTERACTION_TYPES] },
              predictionSubmitted: { not: null },
            },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  }).then((rows) => rows.filter((row) => isAfterConsent(row.startTime, row.user.consentAt)))

  const header = [
    'participantCode',
    'algorithm',
    'mode',
    'durationSeconds',
    'mentalEffort',
    'confidence',
    'susScore',
    'startTime',
    'wallClockSeconds',
    'activeSeconds',
    // Topic-completion rule (config/topicCompletion.ts): both signals, and
    // whether this session met the rule for the participant's condition.
    'reachedFinalStep',
    'conceptualJunctionsAnswered',
    'topicCompleteBySession',
    // Per participant, repeated on every row like susScore: when a
    // researcher opened the post-test without the rule met, and which
    // topics were incomplete then.
    'posttestOverrideAt',
    'posttestOverrideIncompleteTopics',
    'classicTopicSlug',
    'condition',
  ]

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
      // SUS is one-per-participant (taken once, after the whole study),
      // not per-session - repeated on every row for that participant since
      // the spec calls for it in sessions.csv specifically, which has no
      // separate per-participant row to hold it instead.
      session.user.susScore !== null ? String(session.user.susScore) : '',
      session.startTime.toISOString(),
      session.wallClockSeconds !== null ? String(session.wallClockSeconds) : '',
      session.activeSeconds !== null ? String(session.activeSeconds) : '',
      String(session.reachedFinalStep),
      String(session._count.interactions),
      String(
        isTopicComplete(
          { reachedFinalStep: session.reachedFinalStep, conceptualJunctionsAnswered: session._count.interactions },
          conditionOfSession(session.mode),
        ),
      ),
      session.user.posttestOverrideAt?.toISOString() ?? '',
      session.user.posttestOverrideIncompleteTopics.join(';'),
      session.user.classicTopicSlug ?? '',
      conditionFor(session.algorithmTopic.name, session.user.classicTopicSlug),
    ]
  })

  return toCsv(header, rows)
}

/** One row per misconception event (the detect-remediate-reprobe loop's
 * own record, not the raw interactions) from an active study participant,
 * on a study topic only. */
export async function exportMisconceptionEventsCsv(includePilot = false): Promise<string> {
  const events = await prisma.misconceptionEvent.findMany({
    where: { user: participantWhere(includePilot), algorithmTopic: STUDY_TOPIC_FILTER },
    include: {
      user: { select: { participantCode: true, consentAt: true } },
      algorithmTopic: { select: { displayName: true } },
      probes: { select: { optionCount: true } },
    },
    orderBy: { detectedAt: 'asc' },
  }).then((rows) => rows.filter((row) => isAfterConsent(row.detectedAt, row.user.consentAt)))

  const header = [
    'participantCode',
    'algorithm',
    'category',
    'detectedAt',
    'status',
    'remediationCount',
    'probeCount',
    'junctionsSinceDetection',
    'resolvedAt',
    'bottomedOut',
    'probeOptionCounts',
  ]

  const rows = events.map((event) => [
    event.user.participantCode ?? '',
    event.algorithmTopic.displayName,
    event.category,
    event.detectedAt.toISOString(),
    event.status,
    String(event.remediationCount),
    String(event.probeCount),
    String(event.junctionsSinceDetection),
    event.resolvedAt?.toISOString() ?? '',
    String(event.bottomedOut),
    JSON.stringify(event.probes.map((p) => p.optionCount)),
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
