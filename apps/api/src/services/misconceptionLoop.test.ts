import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkStaleEventsOnSessionStart, detectOrEscalate, evaluateRepeatDetection } from './misconceptionEvent.service'

const { db } = vi.hoisted(() => ({
  db: {
    misconceptionEvent: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    session: { findFirst: vi.fn(), count: vi.fn() },
  },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

beforeEach(() => vi.resetAllMocks())

describe('repeat detection (3C.1, 3C.3)', () => {
  it('escalates like a wrong probe: resets progress and bottoms out on the third', () => {
    expect(evaluateRepeatDetection({ consecutiveCorrect: 1, remediationCount: 0 })).toMatchObject({
      consecutiveCorrect: 0,
      remediationCount: 1,
      status: 'OPEN',
      bottomedOut: false,
    })
    expect(evaluateRepeatDetection({ consecutiveCorrect: 0, remediationCount: 2 })).toMatchObject({
      remediationCount: 3,
      status: 'PERSISTENT',
      bottomedOut: true,
    })
  })

  it('escalates the open event instead of creating a second one', async () => {
    db.misconceptionEvent.findFirst.mockResolvedValueOnce({ id: 'e1', consecutiveCorrect: 1, remediationCount: 1 })
    db.misconceptionEvent.update.mockResolvedValue({ id: 'e1' })
    await detectOrEscalate('u1', 't1', 'ORDER_OF_OPERATIONS', 'i9')
    expect(db.misconceptionEvent.create).not.toHaveBeenCalled()
    expect(db.misconceptionEvent.update.mock.calls[0][0].data).toEqual({
      consecutiveCorrect: 0,
      remediationCount: 2,
      status: 'OPEN',
      bottomedOut: false,
    })
  })

  it('does not reopen a misconception already marked persistent (no double-counted detection)', async () => {
    db.misconceptionEvent.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'e1', status: 'PERSISTENT' })
    const result = await detectOrEscalate('u1', 't1', 'ORDER_OF_OPERATIONS', 'i9')
    expect(result).toEqual({ id: 'e1', status: 'PERSISTENT' })
    expect(db.misconceptionEvent.create).not.toHaveBeenCalled()
  })

  it('opens a new event on a first detection', async () => {
    db.misconceptionEvent.findFirst.mockResolvedValue(null)
    await detectOrEscalate('u1', 't1', 'ORDER_OF_OPERATIONS', 'i9')
    expect(db.misconceptionEvent.create).toHaveBeenCalledOnce()
  })
})

describe('abandonment by leaving the topic (3C.3)', () => {
  const event = { id: 'e1', algorithmTopicId: 'bst', detectedAt: new Date('2026-09-29T10:00:00Z') }

  it('abandons an event whose topic was left for two sessions elsewhere', async () => {
    db.misconceptionEvent.findMany.mockResolvedValue([event])
    db.session.findFirst.mockResolvedValue({ startTime: new Date('2026-09-29T10:05:00Z') })
    db.session.count.mockResolvedValue(2)
    await checkStaleEventsOnSessionStart('u1', 'binary-search')
    expect(db.misconceptionEvent.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { status: 'ABANDONED' } })
    // Counts sessions on OTHER topics since the last session on the event's topic.
    expect(db.session.count.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      startTime: { gt: new Date('2026-09-29T10:05:00Z') },
      NOT: { algorithmTopicId: 'bst' },
    })
  })

  it('keeps it after only one session elsewhere', async () => {
    db.misconceptionEvent.findMany.mockResolvedValue([event])
    db.session.findFirst.mockResolvedValue({ startTime: new Date('2026-09-29T10:05:00Z') })
    db.session.count.mockResolvedValue(1)
    await checkStaleEventsOnSessionStart('u1', 'binary-search')
    expect(db.misconceptionEvent.update).not.toHaveBeenCalled()
  })

  it('never abandons events on the topic being returned to', async () => {
    db.misconceptionEvent.findMany.mockResolvedValue([])
    await checkStaleEventsOnSessionStart('u1', 'bst')
    expect(db.misconceptionEvent.findMany.mock.calls[0][0].where).toMatchObject({ NOT: { algorithmTopicId: 'bst' } })
  })
})
