import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import app from '../app'
import * as authService from '../services/auth.service'
import * as studyService from '../services/study.service'
import * as sessionService from '../services/session.service'

// Services are mocked so these tests exercise the real Express app - body
// parsing, auth, validate() and the router - without a database. vi.mock
// is hoisted above the imports, so the app is built against the mocks.
vi.mock('../services/auth.service', () => ({
  register: vi.fn(),
  login: vi.fn(),
  updateStreak: vi.fn(),
}))
vi.mock('../services/study.service', () => ({
  getStudyStatus: vi.fn(),
  recordConsent: vi.fn(),
  withdrawParticipant: vi.fn(),
  submitSus: vi.fn(),
  enrolParticipant: vi.fn(),
}))
vi.mock('../services/session.service', () => ({
  createSession: vi.fn(),
  updateSession: vi.fn(),
  getSession: vi.fn(),
  getLatestSession: vi.fn(),
}))

// authenticate() reads the secret per request, so setting it here is early enough.
process.env.JWT_SECRET = 'test-secret'

const token = jwt.sign({ userId: 'user-1', role: 'STUDENT' }, 'test-secret')
const bearer = { Authorization: `Bearer ${token}` }

const validRegistration = { email: 'a@b.com', password: 'hunter2!', name: 'A' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validate() error envelope', () => {
  it('rejects an unknown field with a 400 in the standard envelope, with field details', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, role: 'EDUCATOR' })

    expect(res.status).toBe(400)
    expect(res.body.data).toBeNull()
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(typeof res.body.error.message).toBe('string')
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ location: 'body', message: expect.stringContaining('role') }),
    ])
    // The escalation attempt never reaches the service layer at all.
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('names the offending field for a missing or wrongly typed value', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com', password: 42 })

    expect(res.status).toBe(400)
    const paths = res.body.error.details.map((d: { path: string }) => d.path).sort()
    expect(paths).toEqual(['name', 'password'])
  })

  it('returns 400, not 500, for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.com", ')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON', details: [] },
    })
  })

  it('rejects an undeclared query parameter', async () => {
    const res = await request(app).get('/api/v1/sessions?latest=true&debug=1').set(bearer)

    expect(res.status).toBe(400)
    expect(res.body.error.details[0]).toMatchObject({ location: 'query' })
    expect(sessionService.getLatestSession).not.toHaveBeenCalled()
  })

  it('rejects a body on a route that takes none', async () => {
    const res = await request(app).post('/api/v1/study/consent').set(bearer).send({ consented: true })

    expect(res.status).toBe(400)
    expect(studyService.recordConsent).not.toHaveBeenCalled()
  })

  it('authenticates before validating, so an anonymous caller learns nothing about the schema', async () => {
    const res = await request(app).post('/api/v1/study/sus').send({ nonsense: true })

    expect(res.status).toBe(401)
  })
})

describe('valid requests still pass end to end', () => {
  it('registers with exactly the declared fields', async () => {
    vi.mocked(authService.register).mockResolvedValue({ token: 't', user: { role: 'STUDENT' } } as never)

    const res = await request(app).post('/api/v1/auth/register').send(validRegistration)

    expect(res.status).toBe(201)
    expect(authService.register).toHaveBeenCalledWith(validRegistration)
  })

  it('records a valid SUS submission for the authenticated user', async () => {
    vi.mocked(studyService.submitSus).mockResolvedValue({ score: 75 } as never)
    const responses = [4, 2, 4, 2, 4, 2, 4, 2, 4, 2]

    const res = await request(app).post('/api/v1/study/sus').set(bearer).send({ responses })

    expect(res.status).toBe(200)
    expect(studyService.submitSus).toHaveBeenCalledWith('user-1', responses)
  })

  it('accepts the session-end survey and rejects an out-of-scale rating', async () => {
    vi.mocked(sessionService.updateSession).mockResolvedValue({ id: 's1' } as never)

    const ok = await request(app).patch('/api/v1/sessions/s1').set(bearer).send({ mentalEffort: 7, confidence: 4 })
    expect(ok.status).toBe(200)
    expect(sessionService.updateSession).toHaveBeenCalledWith('s1', 'user-1', { mentalEffort: 7, confidence: 4 })

    const bad = await request(app).patch('/api/v1/sessions/s1').set(bearer).send({ mentalEffort: 12, confidence: 4 })
    expect(bad.status).toBe(400)
    expect(bad.body.error.details[0]).toMatchObject({ location: 'body', path: 'mentalEffort' })
  })

  it('rejects a SUS submission that is not ten 1-5 answers', async () => {
    const res = await request(app).post('/api/v1/study/sus').set(bearer).send({ responses: [1, 2, 3] })

    expect(res.status).toBe(400)
    expect(studyService.submitSus).not.toHaveBeenCalled()
  })
})
