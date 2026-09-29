import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enrolParticipant, overridePosttest } from './study.service'

const { db } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    assessmentAttempt: { findFirst: vi.fn() },
    session: { findMany: vi.fn() },
  },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

const consentAt = new Date('2026-09-29T08:00:00Z')

beforeEach(() => {
  vi.resetAllMocks()
  process.env.STUDY_ENROLMENT_CODES = 'P01,PILOT-2'
  process.env.STUDY_RESEARCHER_PIN = '482913'
  db.assessmentAttempt.findFirst.mockResolvedValue(null)
  db.session.findMany.mockResolvedValue([])
})

describe('enrolment while the consent page still has placeholders', () => {
  it('refuses a real participant code', async () => {
    await expect(enrolParticipant('u1', 'P01')).rejects.toThrow('ENROLMENT_NOT_OPEN')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('still allows a pilot code, so the flow can be tested', async () => {
    db.user.findUnique.mockResolvedValue(null)
    await enrolParticipant('u1', 'pilot-2')
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { participantCode: 'PILOT-2' } })
  })
})

describe('researcher post-test override', () => {
  const participant = { participantCode: 'PILOT-2', consentAt, withdrawnAt: null, posttestOverrideAt: null }

  it('rejects a wrong PIN and records nothing', async () => {
    await expect(overridePosttest('u1', '000000')).rejects.toThrow('WRONG_PIN')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('is refused when no PIN is configured', async () => {
    process.env.STUDY_RESEARCHER_PIN = ''
    await expect(overridePosttest('u1', '482913')).rejects.toThrow('OVERRIDE_NOT_CONFIGURED')
  })

  it('records when it happened and which topics were still incomplete', async () => {
    db.user.findUnique.mockResolvedValue(participant)
    db.session.findMany.mockResolvedValue([
      { reachedFinalStep: true, algorithmTopic: { name: 'bubble-sort' }, _count: { interactions: 2 } },
      // Reached the end but answered no checkpoint: not complete.
      { reachedFinalStep: true, algorithmTopic: { name: 'bst' }, _count: { interactions: 0 } },
    ])
    await overridePosttest('u1', ' 482913 ')
    const data = db.user.update.mock.calls[0][0].data
    expect(data.posttestOverrideAt).toBeInstanceOf(Date)
    expect(data.posttestOverrideIncompleteTopics).toEqual(['binary-search', 'bst'])
  })
})
