import { prisma } from '../lib/prisma'
import { SCORED_INTERACTION_TYPES } from '../config/interactionTypes'
import { TOPIC_COMPLETE_PERCENT, TOPIC_MASTERED_PERCENT } from '../config/topicProgress'
import { getAllTopics } from './topic.service'
import type { TopicDto } from '../dtos/topic.dto'
import type { LearnerAnalyticsDto } from '../dtos/learnerAnalytics.dto'

/** Sessions charted: the most recent with answered predictions. */
export const TRAJECTORY_SESSIONS = 20

export interface ScoredInteraction {
  sessionId: string
  /** The session's topic and start, for labelling its trajectory. */
  session: { startTime: Date; topic: string }
  predictionCorrect: boolean | null
  hintsRequested: number
  masteryScoreAtTime: number
  scaffoldingLevelAtTime: string
}

export interface SessionRow {
  id: string
  topic: string
  mode: string
  startTime: Date
  activeSeconds: number | null
}

/**
 * The profile's longitudinal figures (Phase 6C), as pure arithmetic over
 * rows already fetched, so a test can check every number by hand.
 *
 * Topic figures use each topic's mastery exactly as the topic list reports
 * it (topic.service.ts), so the profile and Home never show two different
 * mastery indexes. TopicMastery is not used: it is written only when a
 * session closes with predictions, so it lags and is often missing.
 */
export function summariseLearner(input: {
  topics: Pick<TopicDto, 'track' | 'masteryPercent' | 'isLocked'>[]
  interactions: ScoredInteraction[]
  practiceSeconds: number
  misconceptions: { category: string; status: string; count: number }[]
  recentSessions: SessionRow[]
}): LearnerAnalyticsDto {
  const { topics, interactions } = input
  const unlocked = topics.filter((t) => !t.isLocked)
  const masteryIndex = unlocked.length ? Math.round(unlocked.reduce((sum, t) => sum + t.masteryPercent, 0) / unlocked.length) : 0

  const answered = interactions.filter((i) => i.predictionCorrect !== null)
  const correct = answered.filter((i) => i.predictionCorrect).length
  const hintsUsed = answered.reduce((sum, i) => sum + i.hintsRequested, 0)

  const byTrack = new Map<string, { topics: number; complete: number; masterySum: number }>()
  for (const t of topics) {
    const row = byTrack.get(t.track) ?? { topics: 0, complete: 0, masterySum: 0 }
    row.topics += 1
    row.complete += t.masteryPercent >= TOPIC_COMPLETE_PERCENT ? 1 : 0
    row.masterySum += t.masteryPercent
    byTrack.set(t.track, row)
  }

  const byCategory = new Map<string, { detected: number; resolved: number }>()
  for (const m of input.misconceptions) {
    const row = byCategory.get(m.category) ?? { detected: 0, resolved: 0 }
    row.detected += m.count
    row.resolved += m.status === 'RESOLVED' ? m.count : 0
    byCategory.set(m.category, row)
  }

  const perSession = new Map<string, { predictions: number; correct: number }>()
  for (const i of answered) {
    const row = perSession.get(i.sessionId) ?? { predictions: 0, correct: 0 }
    row.predictions += 1
    row.correct += i.predictionCorrect ? 1 : 0
    perSession.set(i.sessionId, row)
  }

  return {
    summary: {
      masteryIndex,
      topicsTotal: topics.length,
      topicsStarted: topics.filter((t) => t.masteryPercent > 0).length,
      topicsCompleted: topics.filter((t) => t.masteryPercent >= TOPIC_COMPLETE_PERCENT).length,
      topicsMastered: topics.filter((t) => t.masteryPercent >= TOPIC_MASTERED_PERCENT).length,
      practiceSeconds: input.practiceSeconds,
      predictions: answered.length,
      correctPredictions: correct,
      accuracy: answered.length ? Math.round((correct / answered.length) * 100) : null,
      hintsUsed,
      hintsPerPrediction: answered.length ? Math.round((hintsUsed / answered.length) * 100) / 100 : null,
    },
    trajectory: trajectoryBySession(answered),
    modules: [...byTrack.entries()].map(([track, row]) => ({
      track,
      topics: row.topics,
      complete: row.complete,
      meanMastery: Math.round(row.masterySum / row.topics),
    })),
    misconceptions: [...byCategory.entries()]
      .map(([category, row]) => ({ category, detected: row.detected, resolved: row.resolved, open: row.detected - row.resolved }))
      .sort((a, b) => b.detected - a.detected),
    recentSessions: input.recentSessions.map((s) => ({
      id: s.id,
      topic: s.topic,
      mode: s.mode,
      startTime: s.startTime.toISOString(),
      activeSeconds: s.activeSeconds,
      predictions: perSession.get(s.id)?.predictions ?? 0,
      correct: perSession.get(s.id)?.correct ?? 0,
    })),
  }
}

/** Answered predictions grouped by session, in answer order, newest session first. */
function trajectoryBySession(answered: ScoredInteraction[]): LearnerAnalyticsDto['trajectory'] {
  const sessions = new Map<string, LearnerAnalyticsDto['trajectory'][number]>()
  for (const i of answered) {
    let entry = sessions.get(i.sessionId)
    if (!entry) {
      entry = { sessionId: i.sessionId, topic: i.session.topic, startTime: i.session.startTime.toISOString(), points: [] }
      sessions.set(i.sessionId, entry)
    }
    entry.points.push({ score: i.masteryScoreAtTime, level: i.scaffoldingLevelAtTime })
  }
  return [...sessions.values()].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, TRAJECTORY_SESSIONS)
}

/** Every figure on the profile in one request (Phase 6C). */
export async function getLearnerAnalytics(userId: string): Promise<LearnerAnalyticsDto> {
  const [topics, interactions, time, misconceptions, sessions] = await Promise.all([
    getAllTopics(userId),
    prisma.interaction.findMany({
      where: { session: { userId }, interactionType: { in: [...SCORED_INTERACTION_TYPES] } },
      select: {
        sessionId: true,
        predictionCorrect: true,
        hintsRequested: true,
        masteryScoreAtTime: true,
        scaffoldingLevelAtTime: true,
        session: { select: { startTime: true, algorithmTopic: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.session.aggregate({ where: { userId }, _sum: { activeSeconds: true } }),
    prisma.misconceptionEvent.groupBy({ by: ['category', 'status'], where: { userId }, _count: { _all: true } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 10,
      select: { id: true, mode: true, startTime: true, activeSeconds: true, algorithmTopic: { select: { displayName: true } } },
    }),
  ])

  return summariseLearner({
    topics,
    interactions: interactions.map((i) => ({ ...i, session: { startTime: i.session.startTime, topic: i.session.algorithmTopic.displayName } })),
    practiceSeconds: time._sum.activeSeconds ?? 0,
    misconceptions: misconceptions.map((m) => ({ category: m.category, status: m.status, count: m._count._all })),
    recentSessions: sessions.map((s) => ({ id: s.id, topic: s.algorithmTopic.displayName, mode: s.mode, startTime: s.startTime, activeSeconds: s.activeSeconds })),
  })
}
