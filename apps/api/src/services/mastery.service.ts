import type { TopicMastery } from '@dsa-tutor/types'
import { prisma } from '../lib/prisma'
import { logEvent } from '../lib/log'
import { SCORED_INTERACTION_TYPES } from '../config/interactionTypes'
import { MASTERY_INTERACTION_TYPES, computeMastery, meetsEveryCriterion, type MasteryRow } from '../config/mastery'

const MASTERY_ROW_SELECT = {
  interactionType: true,
  predictionCorrect: true,
  attemptIndex: true,
  hintIndexAtResolve: true,
  hintsRequested: true,
  bottomedOut: true,
  inputHash: true,
  promptKey: true,
  rubricScore: true,
  masteryScoreAtTime: true,
  createdAt: true,
  junctionDifficulty: true,
} as const

/** Every rubric row of one user, oldest first, grouped by topic id. */
export async function masteryRowsByTopic(userId: string): Promise<Map<string, MasteryRow[]>> {
  const rows = await prisma.interaction.findMany({
    where: { session: { userId }, interactionType: { in: [...MASTERY_INTERACTION_TYPES] } },
    select: { ...MASTERY_ROW_SELECT, session: { select: { algorithmTopicId: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const byTopic = new Map<string, MasteryRow[]>()
  for (const { session, ...row } of rows) {
    const list = byTopic.get(session.algorithmTopicId)
    if (list) list.push(row)
    else byTopic.set(session.algorithmTopicId, [row])
  }
  return byTopic
}

/** When each of a user's topics was first mastered, by topic id. */
export async function masteredAtByTopic(userId: string): Promise<Map<string, Date>> {
  const rows = await prisma.topicMastery.findMany({
    where: { userId, masteredAt: { not: null } },
    select: { algorithmTopicId: true, masteredAt: true },
  })
  return new Map(rows.map((row) => [row.algorithmTopicId, row.masteredAt!]))
}

function percent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

/**
 * Recomputes one topic's rubric from its rows and stores it on
 * TopicMastery: the four criteria in criteriaMet, and masteredAt the first
 * time every applicable criterion is met (it is never cleared). A topic
 * with no row yet gets one, its scores taken from the same rows; the
 * session-end write replaces them with the client's assessment.
 */
export async function refreshTopicMastery(userId: string, algorithmTopicId: string, topicSlug: string): Promise<TopicMastery> {
  const [rows, existing] = await Promise.all([
    prisma.interaction.findMany({
      where: { session: { userId, algorithmTopicId }, interactionType: { in: [...MASTERY_INTERACTION_TYPES] } },
      select: MASTERY_ROW_SELECT,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.topicMastery.findUnique({
      where: { userId_algorithmTopicId: { userId, algorithmTopicId } },
      select: { masteredAt: true },
    }),
  ])
  const computed = computeMastery(topicSlug, rows, existing?.masteredAt ?? null)
  const masteredAt = existing?.masteredAt ?? (meetsEveryCriterion(computed) ? new Date() : null)
  const mastery = { ...computed, masteredAt: masteredAt?.toISOString() ?? null }
  const criteriaMet = mastery.criteria.map((criterion) => ({ ...criterion }))

  const scored = rows.filter((row) => (SCORED_INTERACTION_TYPES as readonly string[]).includes(row.interactionType) && row.predictionCorrect !== null)
  const correct = scored.filter((row) => row.predictionCorrect).length
  const conceptual = scored.filter((row) => row.junctionDifficulty === 'CONCEPTUAL')
  const procedural = scored.filter((row) => row.junctionDifficulty !== 'CONCEPTUAL')
  const lastPracticedAt = rows.at(-1)?.createdAt ?? new Date()

  await prisma.topicMastery.upsert({
    where: { userId_algorithmTopicId: { userId, algorithmTopicId } },
    update: { criteriaMet, masteredAt },
    create: {
      userId,
      algorithmTopicId,
      overallScore: percent(correct, scored.length),
      conceptualScore: percent(conceptual.filter((row) => row.predictionCorrect).length, conceptual.length),
      proceduralScore: percent(procedural.filter((row) => row.predictionCorrect).length, procedural.length),
      totalPredictions: scored.length,
      correctPredictions: correct,
      lastPracticedAt,
      criteriaMet,
      masteredAt,
    },
  })
  return mastery
}

/**
 * refreshTopicMastery after an interaction write. The interaction is
 * research data and is already stored; a failure here leaves only the
 * derived rubric stale until the next write, so it is logged, not thrown.
 */
export async function refreshTopicMasteryAfterWrite(userId: string, algorithmTopicId: string, topicSlug: string): Promise<void> {
  try {
    await refreshTopicMastery(userId, algorithmTopicId, topicSlug)
  } catch (error) {
    logEvent('mastery_refresh_failed', {
      userId,
      algorithmTopicId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
