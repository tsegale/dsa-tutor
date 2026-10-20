import { afterEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../app'

// authenticate() reads the secret per request, so setting it here is early enough.
process.env.JWT_SECRET = 'test-secret'
const bearer = { Authorization: `Bearer ${jwt.sign({ userId: 'u1', role: 'STUDENT' }, 'test-secret')}` }

const body = {
  algorithmName: 'Bubble Sort',
  question: 'Why does the largest value end up at the end after one pass?',
  currentState: { dataStructureState: [5, 3, 1], activeIndices: [0, 1] },
  stepIndex: 4,
}

const aiReply = {
  answer: 'Each comparison pushes the larger of the two values one place right, so the largest is carried to the end.',
  aiGenerated: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/v1/ai/ask', () => {
  it('forwards the question and the visualisation state to the AI service', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(aiReply), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/ask').set(bearer).send(body)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(aiReply)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/ask\/$/)
    expect(JSON.parse(init.body as string)).toEqual({
      algorithm_name: 'Bubble Sort',
      question: body.question,
      current_state: body.currentState,
      step_index: 4,
      pseudocode: null,
      conversation: [],
    })
  })

  it('passes earlier turns through so a follow-up question resolves', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(aiReply), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const conversation = [{ question: 'What is a pass?', answer: 'One sweep over the array.' }]
    await request(app).post('/api/v1/ai/ask').set(bearer).send({ ...body, conversation })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).conversation).toEqual(conversation)
  })

  it('rejects an empty question before calling the AI', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/ask').set(bearer).send({ ...body, question: '   ' })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a question long enough to be something other than a question', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app)
      .post('/api/v1/ai/ask')
      .set(bearer)
      .send({ ...body, question: 'a'.repeat(501) })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown field rather than forwarding it', async () => {
    // The body is a strictObject: a client cannot smuggle a scaffolding
    // level (or anything else) into Demo mode's assistant.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app)
      .post('/api/v1/ai/ask')
      .set(bearer)
      .send({ ...body, scaffoldingLevel: 'HIGH' })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires authentication', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/ask').send(body)

    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 502 rather than a blank answer when the AI service is down', async () => {
    const fetchMock = vi.fn(async () => new Response('upstream exploded', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/ask').set(bearer).send(body)

    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_SERVICE_ERROR')
  })
})
