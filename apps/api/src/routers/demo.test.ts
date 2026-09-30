import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'

const { db } = vi.hoisted(() => ({
  db: {
    user: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'demo-user', xpTotal: 0, streakCount: 0, ...data })),
    },
  },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

import app from '../app'
import { DEMO_ACCOUNTS_PER_IP_PER_HOUR, DEMO_AI_CALLS_PER_ACCOUNT, resetDemoLimitsForTests } from '../middleware/demo'

process.env.JWT_SECRET = 'test-secret'

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  resetDemoLimitsForTests()
})

describe('POST /api/v1/auth/demo (4D.6)', () => {
  it('creates a demo account and returns a token carrying the demo claim', async () => {
    const res = await request(app).post('/api/v1/auth/demo').send({})
    expect(res.status).toBe(201)
    expect(db.user.create.mock.calls[0][0].data).toMatchObject({ isDemo: true, role: 'STUDENT' })
    const payload = jwt.verify(res.body.data.token, 'test-secret') as { demo?: boolean; userId: string }
    expect(payload).toMatchObject({ demo: true, userId: 'demo-user' })
  })

  it('rate limits demo creation per network', async () => {
    for (let i = 0; i < DEMO_ACCOUNTS_PER_IP_PER_HOUR; i++) {
      expect((await request(app).post('/api/v1/auth/demo').send({})).status).toBe(201)
    }
    const res = await request(app).post('/api/v1/auth/demo').send({})
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('DEMO_RATE_LIMITED')
  })
})

describe('demo AI allowance', () => {
  const demoBearer = { Authorization: `Bearer ${jwt.sign({ userId: 'demo-1', role: 'STUDENT', demo: true }, 'test-secret')}` }
  const hint = { algorithmName: 'Bubble Sort', stepIndex: 1, currentState: [2, 1], scaffoldingLevel: 'HIGH', errorHistory: [] }

  it('stops a demo account at the cap without calling the AI service', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hint: 'h' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    for (let i = 0; i < DEMO_AI_CALLS_PER_ACCOUNT; i++) {
      await request(app).post('/api/v1/ai/hints').set(demoBearer).send(hint)
    }
    const callsBefore = fetchMock.mock.calls.length
    const res = await request(app).post('/api/v1/ai/hints').set(demoBearer).send(hint)
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('DEMO_AI_LIMIT')
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })
})
