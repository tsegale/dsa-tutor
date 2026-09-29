import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStudyStatus } from './study.service'
import { isAfterConsent } from './research.service'

// vi.mock is hoisted above the imports, so the services get this prisma.
const { consentAt, sessionFindMany } = vi.hoisted(() => ({
  consentAt: new Date('2026-09-29T08:00:00Z'),
  sessionFindMany: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ participantCode: 'PILOT-1', consentAt, withdrawnAt: null })) },
    assessmentAttempt: { findFirst: vi.fn(async () => null) },
    session: { findMany: sessionFindMany },
  },
}))

describe('consent cut-off', () => {
  beforeEach(() => sessionFindMany.mockReset().mockResolvedValue([]))

  it('counts only sessions started after consent toward unlocking the post-test', async () => {
    await getStudyStatus('u1')
    expect(sessionFindMany).toHaveBeenCalledOnce()
    expect(sessionFindMany.mock.calls[0][0].where.startTime).toEqual({ gte: consentAt })
  })

  it('exports only data recorded at or after consent, and nothing without consent', () => {
    expect(isAfterConsent(new Date('2026-09-28T12:00:00Z'), consentAt)).toBe(false)
    expect(isAfterConsent(consentAt, consentAt)).toBe(true)
    expect(isAfterConsent(new Date('2026-09-29T09:00:00Z'), consentAt)).toBe(true)
    expect(isAfterConsent(new Date('2026-09-29T09:00:00Z'), null)).toBe(false)
  })
})
