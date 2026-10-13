import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

/**
 * Delete an account and everything recorded for it (Phase 6E): sessions and
 * their interactions, misconception events, assessments, badges and mastery.
 * For a study participant this removes their research data too, which is
 * why the profile points them at withdrawal if they only want to leave the
 * study. The current password confirms it. Educator accounts (they hold the
 * research exports) and demo accounts (the presentation account) are refused.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, role: true, isDemo: true } })
  if (!user) throw new Error('NOT_FOUND')
  if (user.isDemo) throw new Error('DEMO_ACCOUNT')
  if (user.role === 'EDUCATOR') throw new Error('EDUCATOR_ACCOUNT')
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new Error('INVALID_CREDENTIALS')

  await prisma.$transaction([
    prisma.misconceptionRating.deleteMany({ where: { interaction: { session: { userId } } } }),
    prisma.interaction.deleteMany({ where: { session: { userId } } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.remediation.deleteMany({ where: { event: { userId } } }),
    prisma.misconceptionProbe.deleteMany({ where: { event: { userId } } }),
    prisma.misconceptionEvent.deleteMany({ where: { userId } }),
    prisma.assessmentResponse.deleteMany({ where: { attempt: { userId } } }),
    prisma.assessmentAttempt.deleteMany({ where: { userId } }),
    prisma.userBadge.deleteMany({ where: { userId } }),
    prisma.topicMastery.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
}
