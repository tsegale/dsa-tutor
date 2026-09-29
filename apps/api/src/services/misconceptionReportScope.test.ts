import { describe, expect, it, vi } from 'vitest'
import { getMisconceptionReport } from './misconceptionReport.service'

const { db } = vi.hoisted(() => ({ db: { misconceptionEvent: { findMany: vi.fn() } } }))
vi.mock('../lib/prisma', () => ({ prisma: db }))

const consentAt = new Date('2026-09-29T08:00:00Z')
const row = (category: string, status: string, detectedAt: Date) => ({
  category, status, detectedAt, junctionsSinceDetection: 3, probes: [{ optionCount: 2 }], user: { consentAt },
})

describe('misconception report scope (3C.5)', () => {
  it('counts only active participants on study topics, excluding pilots by default', async () => {
    db.misconceptionEvent.findMany.mockResolvedValue([])
    await getMisconceptionReport()
    const where = db.misconceptionEvent.findMany.mock.calls[0][0].where
    expect(where.user).toMatchObject({ participantCode: { not: null }, NOT: { participantCode: { startsWith: 'PILOT-' } } })
    expect(where.algorithmTopic).toEqual({ name: { in: ['bubble-sort', 'binary-search', 'bst'] } })
    await getMisconceptionReport(true)
    expect(db.misconceptionEvent.findMany.mock.calls[1][0].where.user).not.toHaveProperty('NOT')
  })

  it('drops events detected before consent', async () => {
    db.misconceptionEvent.findMany.mockResolvedValue([
      row('ORDER_OF_OPERATIONS', 'RESOLVED', new Date('2026-09-28T12:00:00Z')),
      row('ORDER_OF_OPERATIONS', 'OPEN', new Date('2026-09-29T09:00:00Z')),
    ])
    const [only] = await getMisconceptionReport()
    expect(only.detectionCount).toBe(1)
    expect(only.resolvedCount).toBe(0)
  })
})
