import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../app'

describe('OpenAPI spec (4D.3)', () => {
  it('serves a 3.1 spec whose paths come from the live route table', async () => {
    const res = await request(app).get('/api/v1/docs/openapi.json')
    expect(res.status).toBe(200)
    expect(res.body.openapi).toBe('3.1.0')
    const paths = Object.keys(res.body.paths)
    expect(paths.length).toBeGreaterThanOrEqual(45)
    expect(paths).toContain('/api/v1/interactions')
    expect(paths).toContain('/api/v1/sessions/{sessionId}')
  })

  it('derives request bodies from the zod validators, strictness included', async () => {
    const res = await request(app).get('/api/v1/docs/openapi.json')
    const register = res.body.paths['/api/v1/auth/register'].post
    const schema = register.requestBody.content['application/json'].schema
    expect(schema.required).toEqual(expect.arrayContaining(['email', 'password', 'name']))
    // strictObject: no role field can be smuggled in, and the spec says so.
    expect(schema.additionalProperties).toBe(false)
    expect(register.security).toEqual([])
  })

  it('marks authenticated routes and declares path parameters', async () => {
    const res = await request(app).get('/api/v1/docs/openapi.json')
    const op = res.body.paths['/api/v1/sessions/{sessionId}'].patch
    expect(op.security).toBeUndefined() // inherits the global bearer requirement
    expect(op.parameters.some((p: { name: string; in: string }) => p.name === 'sessionId' && p.in === 'path')).toBe(true)
  })

  it('serves a docs page that loads the spec', async () => {
    const res = await request(app).get('/api/v1/docs')
    expect(res.status).toBe(200)
    expect(res.text).toContain('spec-url="/api/v1/docs/openapi.json"')
  })
})
