import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

interface RequestContext {
  requestId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

/** The current request's correlation id, or undefined outside a request. */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId
}

/**
 * Gives every request a correlation id - the caller's X-Request-Id if it
 * sent a sane one, else a fresh UUID - echoes it on the response, and makes
 * it available to anything the request calls (see aiFetch), so the api's
 * and the AI service's logs for one request can be joined.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id')
  const id = incoming && /^[\w-]{1,100}$/.test(incoming) ? incoming : randomUUID()
  res.setHeader('X-Request-Id', id)
  storage.run({ requestId: id }, next)
}
