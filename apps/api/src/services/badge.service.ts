import { SCORED_INTERACTION_TYPES } from '../config/interactionTypes'
import { TOPIC_COMPLETE_PERCENT } from '../config/topicProgress'
import { XP } from '../config/xp'
import { prisma } from '../lib/prisma'

export interface AwardedBadgeDto {
  id: string
  name: string
  awardedAt: string
}

/**
 * Evaluates all six badge conditions server-side from persisted sessions,
 * interactions, topic catalogue, and streak count so achievements stay
 * accurate across devices, reloads, and seeded showcase accounts without
 * depending exclusively on client-side session-end triggers.
 */
export async function evaluateAndAwardBadges(userId: string): Promise<void> {
  if (
    typeof prisma.badge?.findMany !== 'function' ||
    typeof prisma.user?.findUnique !== 'function' ||
    typeof prisma.interaction?.findMany !== 'function' ||
    typeof prisma.algorithmTopic?.findMany !== 'function' ||
    typeof prisma.userBadge?.findMany !== 'function'
  ) {
    return
  }

  try {
    const [allBadges, existingBadges, user, topics, scoredRows] = await Promise.all([
      prisma.badge.findMany({ select: { id: true, name: true } }),
      prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { name: true } } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { streakCount: true } }),
      prisma.algorithmTopic.findMany({ select: { id: true, track: true, isLocked: true } }),
      prisma.interaction.findMany({
        where: {
          session: { userId },
          interactionType: { in: [...SCORED_INTERACTION_TYPES] },
          predictionCorrect: { not: null },
        },
        select: {
          sessionId: true,
          stepIndex: true,
          predictionCorrect: true,
          session: { select: { algorithmTopicId: true, mode: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    if (!user || allBadges.length === 0) return

    const owned = new Set(existingBadges.map((ub) => ub.badge.name))
    const totalPredictions = scoredRows.length

    // Self-corrections: a miss on (sessionId, stepIndex) followed immediately
    // on that same (sessionId, stepIndex) by a correct answer.
    let selfCorrections = 0
    const lastByJunction = new Map<string, boolean>()
    for (const row of scoredRows) {
      const key = `${row.sessionId}:${row.stepIndex}`
      const prev = lastByJunction.get(key)
      const cur = row.predictionCorrect === true
      if (prev === false && cur) selfCorrections += 1
      lastByJunction.set(key, cur)
    }

    // Per-topic practice/hands-on accuracy matching topic.service.ts.
    const byTopic = new Map<string, { total: number; correct: number }>()
    for (const row of scoredRows) {
      if (row.session.mode !== 'PRACTICE' && row.session.mode !== 'HANDS_ON') continue
      const entry = byTopic.get(row.session.algorithmTopicId) ?? { total: 0, correct: 0 }
      entry.total += 1
      if (row.predictionCorrect) entry.correct += 1
      byTopic.set(row.session.algorithmTopicId, entry)
    }

    const masteryPercentOf = (topicId: string): number => {
      const entry = byTopic.get(topicId)
      return entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0
    }

    const unlocked = topics.filter((t) => !t.isLocked)
    const masteredTopics = unlocked.filter((t) => masteryPercentOf(t.id) >= 80).length
    const sortingTopics = unlocked.filter((t) => t.track === 'SORTING')
    const graphsTopics = unlocked.filter((t) => t.track === 'GRAPHS')
    const completedSortingTrack =
      sortingTopics.length > 0 && sortingTopics.every((t) => masteryPercentOf(t.id) >= TOPIC_COMPLETE_PERCENT)
    const completedGraphsTrack =
      graphsTopics.length > 0 && graphsTopics.every((t) => masteryPercentOf(t.id) >= TOPIC_COMPLETE_PERCENT)

    const earned = new Set<string>()
    if (totalPredictions >= 1) earned.add('first-step')
    if (completedSortingTrack) earned.add('sorting-guru')
    if (completedGraphsTrack) earned.add('graph-explorer')
    if (selfCorrections >= 5) earned.add('self-corrector')
    if (user.streakCount >= 7) earned.add('week-warrior')
    if (masteredTopics >= 4) earned.add('dsa-champion')

    for (const badge of allBadges) {
      if (earned.has(badge.name) && !owned.has(badge.name)) {
        await awardBadge(userId, badge.name).catch(() => undefined)
      }
    }
  } catch {
    // Best-effort evaluation; never fail badge reads or interaction writes.
  }
}

export async function getUserBadges(userId: string): Promise<AwardedBadgeDto[]> {
  await evaluateAndAwardBadges(userId)
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { awardedAt: 'asc' },
  })
  return userBadges.map((ub) => ({
    id: ub.badge.id,
    name: ub.badge.name,
    awardedAt: ub.awardedAt.toISOString(),
  }))
}

/** Idempotent: the unique constraint on (userId, badgeId) means awarding
 * the same badge twice is a no-op, not an error - the caller (see
 * badgeService.ts on the frontend) still needs to know whether this call
 * was the one that actually newly earned it, so XP is only granted once. */
export async function awardBadge(userId: string, badgeName: string): Promise<{ newlyAwarded: boolean }> {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } })
  if (!badge) {
    throw new Error('UNKNOWN_BADGE')
  }

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  })
  if (existing) {
    return { newlyAwarded: false }
  }

  // The badge row is unique per user, so its XP can only ever be awarded once.
  await prisma.$transaction([
    prisma.userBadge.create({ data: { userId, badgeId: badge.id } }),
    prisma.user.update({ where: { id: userId }, data: { xpTotal: { increment: XP.BADGE } } }),
  ])
  return { newlyAwarded: true }
}
