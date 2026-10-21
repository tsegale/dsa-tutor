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

// Whether the consent page is finished is config, not behaviour. This
// suite asserts what enrolment DOES when it is unfinished, so it says so
// here rather than leaning on the live studyConsent.json - which stopped
// being unfinished the moment approval was recorded, and silently turned
// the test below into a no-op that passed for the wrong reason.
const { consentComplete } = vi.hoisted(() => ({ consentComplete: vi.fn() }))
vi.mock('../config/studyConsent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/studyConsent')>()),
  consentDetailsComplete: consentComplete,
}))

const consentAt = new Date('2026-09-29T08:00:00Z')

beforeEach(() => {
  vi.resetAllMocks()
  process.env.STUDY_ENROLMENT_CODES = 'P01,PILOT-2'
  process.env.STUDY_RESEARCHER_PIN = '482913'
  db.assessmentAttempt.findFirst.mockResolvedValue(null)
  db.session.findMany.mockResolvedValue([])
  consentComplete.mockReturnValue(false)
})

describe('enrolment while the consent page still has placeholders', () => {
  it('refuses a real participant code', async () => {
    await expect(enrolParticipant('u1', 'P01')).rejects.toThrow('ENROLMENT_NOT_OPEN')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('still allows a pilot code, so the flow can be tested', async () => {
    db.user.findUnique.mockResolvedValue(null)
    await enrolParticipant('u1', 'pilot-2')
    // The Classic topic is fixed at enrolment from the code's ordinal.
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { participantCode: 'PILOT-2', classicTopicSlug: 'binary-search' },
    })
  })
})

describe('enrolment once the consent page is finished', () => {
  it('accepts a real participant code', async () => {
    // The other half of the gate, which nothing covered: every test here
    // ran against an unfinished page, so "opens when complete" was only
    // ever true by assumption.
    consentComplete.mockReturnValue(true)
    db.user.findUnique.mockResolvedValue(null)
    await enrolParticipant('u1', 'P01')
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { participantCode: 'P01', classicTopicSlug: 'bubble-sort' },
    })
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
      { reachedFinalStep: true, mode: 'PRACTICE', algorithmTopic: { name: 'bubble-sort' }, _count: { interactions: 2 } },
      // Reached the end but answered no checkpoint on a tutor topic: not complete.
      { reachedFinalStep: true, mode: 'PRACTICE', algorithmTopic: { name: 'bst' }, _count: { interactions: 0 } },
    ])
    await overridePosttest('u1', ' 482913 ')
    const data = db.user.update.mock.calls[0][0].data
    expect(data.posttestOverrideAt).toBeInstanceOf(Date)
    expect(data.posttestOverrideIncompleteTopics).toEqual(['binary-search', 'bst'])
  })
})
