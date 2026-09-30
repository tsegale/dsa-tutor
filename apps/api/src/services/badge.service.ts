import { XP } from '../config/xp'
import { prisma } from '../lib/prisma'

export interface AwardedBadgeDto {
  id: string
  name: string
  awardedAt: string
}

export async function getUserBadges(userId: string): Promise<AwardedBadgeDto[]> {
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
