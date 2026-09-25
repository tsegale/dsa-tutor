import { afterEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../app'

// authenticate() reads the secret per request, so setting it here is early enough.
process.env.JWT_SECRET = 'test-secret'
const bearer = { Authorization: `Bearer ${jwt.sign({ userId: 'u1', role: 'STUDENT' }, 'test-secret')}` }

const body = {
  algorithmName: 'Bubble Sort',
  stepIndex: 1,
  currentState: { dataStructureState: [7, 3], activeIndices: [0, 1] },
  studentAnswer: 'no-swap',
  errorHistory: [],
  scaffoldingLevel: 'MEDIUM',
  sessionId: 'local-session',
}

const SSE =
  'event: delta\ndata: {"text": "Skipping "}\n\n' +
  'event: delta\ndata: {"text": "the swap"}\n\n' +
  'event: final\ndata: {"outcome": "ai", "replaced": false, "response": {"correct": false}}\n\n'

function upstream(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/v1/ai/predictions/stream', () => {
  it('relays the AI service event stream unchanged', async () => {
    const fetchMock = vi.fn(async () => upstream([SSE.slice(0, 30), SSE.slice(30)]))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/predictions/stream').set(bearer).send(body)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.text).toBe(SSE)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/predictions\/stream$/)
    expect(JSON.parse(init.body as string)).toMatchObject({ algorithm_name: 'Bubble Sort', student_answer: 'no-swap' })
  })

  it('forwards one correlation id to the AI service and echoes it to the client', async () => {
    const fetchMock = vi.fn(async () => upstream([SSE]))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/predictions/stream').set(bearer).send(body)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const forwarded = (init.headers as Record<string, string>)['X-Request-Id']
    expect(forwarded).toMatch(/^[\w-]{8,}$/)
    expect(res.headers['x-request-id']).toBe(forwarded)
  })

  it('reuses a sane caller-supplied id and replaces a malformed one', async () => {
    const fetchMock = vi.fn(async () => upstream([SSE]))
    vi.stubGlobal('fetch', fetchMock)

    await request(app).post('/api/v1/ai/predictions/stream').set(bearer).set('X-Request-Id', 'probe-42').send(body)
    const bad = await request(app)
      .post('/api/v1/ai/predictions/stream')
      .set(bearer)
      .set('X-Request-Id', 'bad id with spaces')
      .send(body)

    const ids = fetchMock.mock.calls.map((call) => ((call as unknown as [string, RequestInit])[1].headers as Record<string, string>)['X-Request-Id'])
    expect(ids[0]).toBe('probe-42')
    expect(ids[1]).not.toBe('bad id with spaces')
    expect(bad.headers['x-request-id']).toBe(ids[1])
  })

  it('answers 502 JSON when the stream cannot be opened', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream([], 500)))

    const res = await request(app).post('/api/v1/ai/predictions/stream').set(bearer).send(body)

    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_SERVICE_ERROR')
  })

  it('validates the body like the JSON prediction route', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/predictions/stream').set(bearer).send({ ...body, extra: 1 })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
