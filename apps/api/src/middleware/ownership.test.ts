import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../app'
import * as sessionService from '../services/session.service'
import * as interactionService from '../services/interaction.service'
import * as assessmentService from '../services/assessment.service'
import * as eventService from '../services/misconceptionEvent.service'
import * as studyService from '../services/study.service'
import * as analyticsService from '../services/analytics.service'
import * as researchService from '../services/research.service'
import { registeredRoutes } from './routeTable.testutil'

// Two students, A and B, each owning one of every resource. The guard's
// count() queries are answered from this table; services are mocked so a
// call reaching one proves the guard let the request through.
const OWNED = {
  session: { sA: 'A', sB: 'B' },
  interaction: { iA: 'A', iB: 'B' },
  assessmentAttempt: { aA: 'A', aB: 'B' },
  misconceptionEvent: { eA: 'A', eB: 'B' },
  remediation: { rA: 'A', rB: 'B' },
} as const

type Where = { id: string; userId?: string; session?: { userId: string }; event?: { userId: string } }

vi.mock('../lib/prisma', () => {
  const countFor = (model: keyof typeof OWNED) =>
    vi.fn(async ({ where }: { where: Where }) => {
      const owner = (OWNED[model] as Record<string, string>)[where.id]
      const userId = where.userId ?? where.session?.userId ?? where.event?.userId
      return owner !== undefined && owner === userId ? 1 : 0
    })
  return {
    prisma: {
      session: { count: countFor('session') },
      interaction: { count: countFor('interaction') },
      assessmentAttempt: { count: countFor('assessmentAttempt') },
      misconceptionEvent: { count: countFor('misconceptionEvent') },
      remediation: { count: countFor('remediation') },
    },
  }
})

vi.mock('../services/session.service', () => ({
  createSession: vi.fn(),
  updateSession: vi.fn(async () => ({})),
  getSession: vi.fn(async () => ({})),
  getLatestSession: vi.fn(),
}))
vi.mock('../services/interaction.service', () => ({
  logInteraction: vi.fn(async () => ({})),
  getSessionInteractions: vi.fn(async () => []),
}))
vi.mock('../services/assessment.service', () => ({
  startAttempt: vi.fn(),
  submitResponse: vi.fn(async () => undefined),
  completeAttempt: vi.fn(async () => undefined),
}))
vi.mock('../services/misconceptionEvent.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/misconceptionEvent.service')>()),
  detectOrEscalate: vi.fn(async () => ({ remediationCount: 0 })),
  presentRemediation: vi.fn(async () => ({})),
  completeRemediation: vi.fn(async () => ({})),
  recordProbe: vi.fn(async () => ({ event: { remediationCount: 0 }, shouldEscalate: false })),
  toEventDto: vi.fn(() => ({})),
}))
vi.mock('../services/study.service', () => ({
  getStudyStatus: vi.fn(),
  recordConsent: vi.fn(),
  withdrawParticipant: vi.fn(),
  submitSus: vi.fn(async () => ({})),
  enrolParticipant: vi.fn(),
}))
vi.mock('../services/analytics.service', () => ({ getEducatorAnalytics: vi.fn(async () => ({})) }))
vi.mock('../services/research.service', () => ({
  exportMisconceptionsCsv: vi.fn(async () => 'a'),
  exportInteractionsCsv: vi.fn(async () => 'a'),
  exportAssessmentsCsv: vi.fn(async () => 'a'),
  exportSessionsCsv: vi.fn(async () => 'a'),
  exportMisconceptionEventsCsv: vi.fn(async () => 'a'),
  importMisconceptionRatings: vi.fn(async () => ({})),
}))

// authenticate() reads the secret per request, so setting it here is early enough.
process.env.JWT_SECRET = 'test-secret'

const as = (userId: string, role = 'STUDENT') => ({
  Authorization: `Bearer ${jwt.sign({ userId, role }, 'test-secret')}`,
})
const studentA = as('A')
const educator = as('EDU', 'EDUCATOR')

const interaction = (sessionId: string) => ({
  sessionId,
  stepIndex: 0,
  predictionSubmitted: 'swap',
  predictionCorrect: true,
  misconceptionCategory: null,
  hintsRequested: 0,
  timeSpentSeconds: 3,
})

function expectNotFound(res: request.Response) {
  expect(res.status).toBe(404)
  // Identical to a nonexistent id, so another user's ids cannot be enumerated.
  expect(res.body).toEqual({ data: null, error: { code: 'NOT_FOUND', message: 'Resource not found' } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("user A cannot touch user B's resources", () => {
  it('session: read and write', async () => {
    expectNotFound(await request(app).get('/api/v1/sessions/sB').set(studentA))
    expectNotFound(await request(app).patch('/api/v1/sessions/sB').set(studentA).send({ completed: true }))
    expect(sessionService.getSession).not.toHaveBeenCalled()
    expect(sessionService.updateSession).not.toHaveBeenCalled()
  })

  it('interactions: read and write', async () => {
    expectNotFound(await request(app).get('/api/v1/interactions/session/sB').set(studentA))
    expectNotFound(await request(app).post('/api/v1/interactions').set(studentA).send(interaction('sB')))
    expect(interactionService.getSessionInteractions).not.toHaveBeenCalled()
    expect(interactionService.logInteraction).not.toHaveBeenCalled()
  })

  it('assessment attempt: answer and complete', async () => {
    const answer = { itemId: 'item-1', response: 'A', timeSpentSeconds: 5 }
    expectNotFound(await request(app).post('/api/v1/assessments/attempts/aB/responses').set(studentA).send(answer))
    expectNotFound(await request(app).post('/api/v1/assessments/attempts/aB/complete').set(studentA))
    expect(assessmentService.submitResponse).not.toHaveBeenCalled()
    expect(assessmentService.completeAttempt).not.toHaveBeenCalled()
  })

  it('misconception events: remediate, probe, complete, and link a detection', async () => {
    expectNotFound(
      await request(app)
        .post('/api/v1/misconception-events/eB/remediations')
        .set(studentA)
        .send({ taskType: 'X', level: 1, payload: {} }),
    )
    expectNotFound(
      await request(app).patch('/api/v1/misconception-events/remediations/rB').set(studentA).send({ skipped: true }),
    )
    const probe = { junctionType: 'SWAP_DECISION', optionCount: 2, correct: true }
    // B's event, and A's event probed with B's interaction: both refused.
    expectNotFound(
      await request(app).post('/api/v1/misconception-events/eB/probes').set(studentA).send({ ...probe, interactionId: 'iA' }),
    )
    expectNotFound(
      await request(app).post('/api/v1/misconception-events/eA/probes').set(studentA).send({ ...probe, interactionId: 'iB' }),
    )
    expectNotFound(
      await request(app)
        .post('/api/v1/misconception-events/detect')
        .set(studentA)
        .send({ algorithmTopicId: 't1', category: 'OFF_BY_ONE', detectedInteractionId: 'iB' }),
    )
    expect(eventService.presentRemediation).not.toHaveBeenCalled()
    expect(eventService.completeRemediation).not.toHaveBeenCalled()
    expect(eventService.recordProbe).not.toHaveBeenCalled()
    expect(eventService.detectOrEscalate).not.toHaveBeenCalled()
  })

  it('SUS response: always recorded against the caller, never a named user', async () => {
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
    const smuggled = await request(app).post('/api/v1/study/sus').set(studentA).send({ responses, userId: 'B' })
    expect(smuggled.status).toBe(400)

    await request(app).post('/api/v1/study/sus').set(studentA).send({ responses })
    expect(studyService.submitSus).toHaveBeenCalledWith('A', responses)
  })

  it('delete: no route can delete any resource', () => {
    expect(registeredRoutes(app).filter((route) => route.method.includes('DELETE'))).toEqual([])
  })
})

describe('owners still reach their own resources', () => {
  it('lets A read and write A-owned rows', async () => {
    expect((await request(app).get('/api/v1/sessions/sA').set(studentA)).status).toBe(200)
    expect((await request(app).post('/api/v1/interactions').set(studentA).send(interaction('sA'))).status).toBe(201)
    expect(
      (
        await request(app)
          .post('/api/v1/misconception-events/eA/probes')
          .set(studentA)
          .send({ interactionId: 'iA', junctionType: 'SWAP_DECISION', optionCount: 2, correct: true })
      ).status,
    ).toBe(200)
    expect(interactionService.logInteraction).toHaveBeenCalledTimes(1)
  })
})

describe('educator scope', () => {
  it('reads aggregate and research data', async () => {
    expect((await request(app).get('/api/v1/analytics').set(educator)).status).toBe(200)
    expect((await request(app).get('/api/v1/research/sessions.csv').set(educator)).status).toBe(200)
    expect(analyticsService.getEducatorAnalytics).toHaveBeenCalled()
    expect(researchService.exportSessionsCsv).toHaveBeenCalled()
  })

  it("never writes to another user's session or interactions", async () => {
    expectNotFound(await request(app).patch('/api/v1/sessions/sA').set(educator).send({ completed: true }))
    expectNotFound(await request(app).post('/api/v1/interactions').set(educator).send(interaction('sA')))
    expect(sessionService.updateSession).not.toHaveBeenCalled()
    expect(interactionService.logInteraction).not.toHaveBeenCalled()
  })
})

describe('students and research data', () => {
  const researchRoutes = registeredRoutes(app).filter((route) => route.path.startsWith('/api/v1/research'))

  it('finds every research route', () => {
    expect(researchRoutes.length).toBeGreaterThanOrEqual(6)
  })

  it('refuses a student on every /research route', async () => {
    for (const route of researchRoutes) {
      const method = route.method.toLowerCase() as 'get' | 'post'
      const res = await request(app)[method](route.path).set(studentA).send(method === 'post' ? { csv: 'a' } : undefined)
      expect(res.status, route.name).toBe(403)
    }
    expect(researchService.exportSessionsCsv).not.toHaveBeenCalled()
    expect(researchService.importMisconceptionRatings).not.toHaveBeenCalled()
  })

  it('refuses a student on the educator-only AI summaries', async () => {
    const res = await request(app).post('/api/v1/ai/summaries/class').set(studentA).send({})
    expect(res.status).toBe(403)
  })
})
