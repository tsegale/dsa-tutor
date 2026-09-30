import { beforeEach, describe, expect, it, vi } from 'vitest'
import { wrongAnswerFallbackRate } from './ops.service'

const { db } = vi.hoisted(() => ({
  db: { interaction: { count: vi.fn(), groupBy: vi.fn() } },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

beforeEach(() => vi.clearAllMocks())

describe('wrong-answer fallback rate (4D.4)', () => {
  it('is the share of wrong answers shown feedback whose feedback was not the model\'s, by reason', async () => {
    db.interaction.count.mockResolvedValue(20)
    db.interaction.groupBy.mockResolvedValue([
      { aiFailureReason: 'timeout', _count: { _all: 1 } },
      { aiFailureReason: 'answer_leak', _count: { _all: 3 } },
      { aiFailureReason: null, _count: { _all: 1 } },
    ])
    const since = new Date('2026-09-23T00:00:00Z')
    const result = await wrongAnswerFallbackRate(since)
    expect(result.rate).toBe(0.25)
    expect(result.fallbacks).toBe(5)
    expect(result.byReason).toEqual([
      { reason: 'answer_leak', count: 3 },
      { reason: 'timeout', count: 1 },
      { reason: 'unrecorded', count: 1 },
    ])
    // The CLAUDE.md definition: wrong PREDICTION rows that carried feedback.
    expect(db.interaction.count.mock.calls[0][0].where).toMatchObject({
      predictionCorrect: false,
      interactionType: 'PREDICTION',
      feedbackText: { not: null },
      createdAt: { gte: since },
    })
    expect(db.interaction.groupBy.mock.calls[0][0].where).toMatchObject({ aiGenerated: false })
  })

  it('reports no rate, not zero, when there were no wrong answers', async () => {
    db.interaction.count.mockResolvedValue(0)
    db.interaction.groupBy.mockResolvedValue([])
    expect((await wrongAnswerFallbackRate(new Date())).rate).toBeNull()
  })
})
