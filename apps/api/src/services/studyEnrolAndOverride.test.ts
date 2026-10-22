import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { enrolParticipant, formatParticipantCode, overridePosttest } from './study.service'

const { db } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
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
  process.env.STUDY_RESEARCHER_PIN = '482913'
  db.assessmentAttempt.findFirst.mockResolvedValue(null)
  db.session.findMany.mockResolvedValue([])
  db.user.findMany.mockResolvedValue([])
  consentComplete.mockReturnValue(false)
})

/** Codes already held by other participants. */
const taken = (...codes: string[]) => db.user.findMany.mockResolvedValue(codes.map((participantCode) => ({ participantCode })))

const assigned = () => db.user.update.mock.calls.at(-1)?.[0].data

const conflict = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['participantCode'] },
  })

describe('enrolment while the consent page still has placeholders', () => {
  it('refuses to enrol anyone', async () => {
    // There is no pilot code to exempt any more: joining takes one click
    // and the code is assigned, so this gate is all there is.
    await expect(enrolParticipant('u1')).rejects.toThrow('ENROLMENT_NOT_OPEN')
    expect(db.user.update).not.toHaveBeenCalled()
  })
})

describe('enrolment once the consent page is finished', () => {
  beforeEach(() => {
    consentComplete.mockReturnValue(true)
    db.user.findUnique.mockResolvedValue(null)
  })

  it('needs no code from the participant', async () => {
    expect(enrolParticipant.length).toBe(1)
  })

  it('assigns the first participant P01, and bubble-sort as their Classic topic', async () => {
    await enrolParticipant('u1')
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { participantCode: 'P01', classicTopicSlug: 'bubble-sort' },
    })
  })

  it('assigns the next free code, and rotates the Classic topic with it', async () => {
    // The reason the code is sequential: its ordinal is what spreads
    // participants evenly across the three conditions.
    for (const [held, code, classic] of [
      [['P01'], 'P02', 'binary-search'],
      [['P01', 'P02'], 'P03', 'bst'],
      [['P01', 'P02', 'P03'], 'P04', 'bubble-sort'],
    ] as const) {
      db.user.update.mockClear()
      taken(...held)
      await enrolParticipant('u1')
      expect(assigned(), held.join(',')).toEqual({ participantCode: code, classicTopicSlug: classic })
    }
  })

  it('fills a gap rather than running past it, so no ordinal is skipped', async () => {
    taken('P01', 'P03')
    await enrolParticipant('u1')
    expect(assigned().participantCode).toBe('P02')
  })

  it('ignores a pilot code already in the database when numbering', async () => {
    // Pilot rows from before this change keep their codes and stay out of
    // the exports; they must not push the next participant off P01.
    taken('PILOT-1', 'PILOT-2')
    await enrolParticipant('u1')
    expect(assigned().participantCode).toBe('P01')
  })

  it('takes the next ordinal when another participant wins the race for one', async () => {
    // The unique index is the real guard, so a lost race is a retry.
    db.user.update.mockRejectedValueOnce(conflict())
    db.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ participantCode: 'P01' }])
    await enrolParticipant('u1')
    expect(assigned()).toEqual({ participantCode: 'P02', classicTopicSlug: 'binary-search' })
  })

  it('gives up rather than looping forever if it keeps losing', async () => {
    db.user.update.mockRejectedValue(conflict())
    await expect(enrolParticipant('u1')).rejects.toThrow('ENROLMENT_RACE')
  })

  it('never lets a demo account become study data', async () => {
    db.user.findUnique.mockResolvedValue({ participantCode: null, isDemo: true })
    await expect(enrolParticipant('u1')).rejects.toThrow('DEMO_ACCOUNT')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('refuses a second enrolment, so a code is never re-rolled', async () => {
    db.user.findUnique.mockResolvedValue({ participantCode: 'P04', isDemo: false })
    await expect(enrolParticipant('u1')).rejects.toThrow('ALREADY_ENROLLED')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('does not let a write failure that is not a code clash look like a race', async () => {
    db.user.update.mockRejectedValue(new Error('connection lost'))
    await expect(enrolParticipant('u1')).rejects.toThrow('connection lost')
  })
})

describe('formatParticipantCode', () => {
  it('pads to two digits so a sorted list of codes reads in order', () => {
    expect([1, 2, 9, 10, 12].map(formatParticipantCode)).toEqual(['P01', 'P02', 'P09', 'P10', 'P12'])
  })

  it('keeps going past twelve', () => {
    expect(formatParticipantCode(13)).toBe('P13')
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
