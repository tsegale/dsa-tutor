import { afterEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../app'

// authenticate() reads the secret per request, so setting it here is early enough.
process.env.JWT_SECRET = 'test-secret'
const bearer = { Authorization: `Bearer ${jwt.sign({ userId: 'u1', role: 'STUDENT' }, 'test-secret')}` }

const body = {
  algorithmName: 'Bubble Sort',
  promptKey: 'bubble-sort.pass-complete',
  question: 'Why is the largest unsorted element now in its final position?',
  rubric: [
    { id: 'carried_right', criterion: 'the larger value of each pair moves right' },
    { id: 'not_revisited', criterion: 'later passes stop before that position' },
  ],
  studentResponse: 'Every swap pushes the big one right.',
}

const aiReply = {
  results: [{ id: 'carried_right', met: true }, { id: 'not_revisited', met: false }],
  score: 50,
  acknowledgement: 'You saw that swaps carry the larger value right.',
  followUpQuestion: 'Does any later pass touch that last position?',
  aiGenerated: true,
  failureReason: null,
  promptVersion: '2026-09-28.1',
  aiModel: 'claude-sonnet-4-6',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/v1/ai/self-explanations', () => {
  it('forwards the prompt and response to the AI service and returns its judgement', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(aiReply), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app).post('/api/v1/ai/self-explanations').set(bearer).send(body)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(aiReply)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/self-explanations$/)
    expect(JSON.parse(init.body as string)).toEqual({
      algorithm_name: 'Bubble Sort',
      prompt_key: 'bubble-sort.pass-complete',
      question: body.question,
      rubric: body.rubric,
      student_response: body.studentResponse,
    })
  })

  it('rejects a rubric with fewer than two criteria before calling the AI', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app)
      .post('/api/v1/ai/self-explanations')
      .set(bearer)
      .send({ ...body, rubric: body.rubric.slice(0, 1) })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
