import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { validateStringBody } from './validateRequest'

function mockRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

describe('validateStringBody', () => {
  it('calls next for a body with exactly the required fields', () => {
    const middleware = validateStringBody(['email', 'password', 'name'])
    const req = { body: { email: 'a@b.com', password: 'hunter2!', name: 'A' } } as Request
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects a body carrying a role field not in the allowed set', () => {
    const middleware = validateStringBody(['email', 'password', 'name'])
    const req = {
      body: { email: 'a@b.com', password: 'hunter2!', name: 'A', role: 'EDUCATOR' },
    } as Request
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    )
  })

  it('rejects a body missing a required field', () => {
    const middleware = validateStringBody(['email', 'password'])
    const req = { body: { email: 'a@b.com' } } as Request
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects a non-string value for a required field', () => {
    const middleware = validateStringBody(['email', 'password'])
    const req = { body: { email: 'a@b.com', password: 12345678 } } as unknown as Request
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
