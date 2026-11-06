import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: {
    badge: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userBadge: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    algorithmTopic: {
      findMany: vi.fn(),
    },
    interaction: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

vi.mock('../lib/prisma', () => ({ prisma: db }))

import { getUserBadges } from './badge.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('server-side badge evaluation (badge.service)', () => {
  it('evaluates and awards earned badges idempotently on getUserBadges', async () => {
    db.badge.findMany.mockResolvedValue([
      { id: 'b1', name: 'first-step' },
      { id: 'b2', name: 'week-warrior' },
      { id: 'b3', name: 'dsa-champion' },
      { id: 'b4', name: 'self-corrector' },
    ])
    db.badge.findUnique.mockImplementation(async ({ where }: { where: { name: string } }) => ({
      id: `id-${where.name}`,
      name: where.name,
    }))
    // First findMany inside evaluateAndAwardBadges returns empty; second returns newly awarded rows
    db.userBadge.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { awardedAt: new Date('2026-10-30T10:00:00Z'), badge: { id: 'id-first-step', name: 'first-step' } },
        { awardedAt: new Date('2026-10-30T10:00:01Z'), badge: { id: 'id-week-warrior', name: 'week-warrior' } },
        { awardedAt: new Date('2026-10-30T10:00:02Z'), badge: { id: 'id-dsa-champion', name: 'dsa-champion' } },
      ])
    db.userBadge.findUnique.mockResolvedValue(null)
    db.userBadge.create.mockResolvedValue({})
    db.user.findUnique.mockResolvedValue({ streakCount: 8 })
    db.user.update.mockResolvedValue({})
    db.algorithmTopic.findMany.mockResolvedValue([
      { id: 't1', track: 'FOUNDATIONS', isLocked: false },
      { id: 't2', track: 'FOUNDATIONS', isLocked: false },
      { id: 't3', track: 'SORTING', isLocked: false },
      { id: 't4', track: 'SEARCHING', isLocked: false },
    ])
    db.interaction.findMany.mockResolvedValue([
      { sessionId: 's1', stepIndex: 1, predictionCorrect: true, session: { algorithmTopicId: 't1', mode: 'PRACTICE' } },
      { sessionId: 's2', stepIndex: 1, predictionCorrect: true, session: { algorithmTopicId: 't2', mode: 'PRACTICE' } },
      { sessionId: 's3', stepIndex: 1, predictionCorrect: true, session: { algorithmTopicId: 't3', mode: 'HANDS_ON' } },
      { sessionId: 's4', stepIndex: 1, predictionCorrect: true, session: { algorithmTopicId: 't4', mode: 'PRACTICE' } },
    ])

    const awarded = await getUserBadges('u1')
    expect(awarded.map((b) => b.name)).toEqual(['first-step', 'week-warrior', 'dsa-champion'])
    expect(db.userBadge.create).toHaveBeenCalledTimes(3)
  })
})
