import { describe, expect, it, vi } from 'vitest'
import { getStudyStatus } from './study.service'

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique },
    assessmentAttempt: { findFirst: vi.fn(async () => null) },
    session: { findMany: vi.fn(async () => []) },
  },
}))

describe('study status isDemo', () => {
  it('flags a demo account, so the app does not offer it the study', async () => {
    findUnique.mockResolvedValueOnce({ participantCode: null, consentAt: null, withdrawnAt: null, posttestOverrideAt: null, classicTopicSlug: null, isDemo: true })
    expect(await getStudyStatus('demo')).toMatchObject({ isParticipant: false, isDemo: true })
  })

  it('does not flag an ordinary non-participant', async () => {
    findUnique.mockResolvedValueOnce({ participantCode: null, consentAt: null, withdrawnAt: null, posttestOverrideAt: null, classicTopicSlug: null, isDemo: false })
    expect(await getStudyStatus('student')).toMatchObject({ isParticipant: false, isDemo: false })
  })

  it('never flags a participant', async () => {
    findUnique.mockResolvedValueOnce({ participantCode: 'P01', consentAt: new Date(), withdrawnAt: null, posttestOverrideAt: null, classicTopicSlug: 'bst', isDemo: false })
    expect(await getStudyStatus('participant')).toMatchObject({ isParticipant: true, isDemo: false })
  })
})

describe('study status participant fields (Phase 6B)', () => {
  it('gives a participant their code, consent date and questionnaire state, never the score', async () => {
    const consentAt = new Date('2026-10-01T09:00:00Z')
    findUnique.mockResolvedValueOnce({ participantCode: 'P04', consentAt, withdrawnAt: null, posttestOverrideAt: null, classicTopicSlug: 'bst', isDemo: false, susSubmittedAt: new Date(), susScore: 85 })
    const status = await getStudyStatus('p4')
    expect(status).toMatchObject({ participantCode: 'P04', consentAt: consentAt.toISOString(), susSubmitted: true })
    expect(JSON.stringify(status)).not.toMatch(/susScore|85/)
  })

  it('gives a non-participant nulls', async () => {
    findUnique.mockResolvedValueOnce({ participantCode: null, consentAt: null, withdrawnAt: null, posttestOverrideAt: null, classicTopicSlug: null, isDemo: false, susSubmittedAt: null })
    expect(await getStudyStatus('s')).toMatchObject({ participantCode: null, consentAt: null, susSubmitted: false })
  })
})
