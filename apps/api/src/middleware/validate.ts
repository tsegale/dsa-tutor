import { NextFunction, Request, RequestHandler, Response } from 'express'
import { z } from 'zod'

// Every route declares its body, params and query through one of these.
// A part left out defaults to an empty strict object, so a route that
// takes no body still rejects one, and a route with a path parameter must
// declare it - an undeclared :id fails validation rather than slipping
// through unchecked. This is how the role-escalation hole existed:
// RegisterDto was a compile-time type only and never checked at runtime.
export interface RequestSchema {
  body?: z.ZodType
  params?: z.ZodType
  query?: z.ZodType
}

const EMPTY = z.strictObject({})

/** The parsed body type a route's schema guarantees once validate() ran. */
export type BodyOf<T extends RequestSchema> = T['body'] extends z.ZodType ? z.infer<T['body']> : never
/** The parsed query type a route's schema guarantees once validate() ran. */
export type QueryOf<T extends RequestSchema> = T['query'] extends z.ZodType ? z.infer<T['query']> : never

// Marks a handler as the validator so a test can prove every registered
// route has one attached (see validate.coverage.test.ts).
export const VALIDATOR_MARK = Symbol('requestValidator')

export interface ValidationIssue {
  location: 'body' | 'params' | 'query'
  path: string
  message: string
}

type MarkedHandler = RequestHandler & { [VALIDATOR_MARK]: RequestSchema }

export function validate(schema: RequestSchema): MarkedHandler {
  const parts = {
    body: schema.body ?? EMPTY,
    params: schema.params ?? EMPTY,
    query: schema.query ?? EMPTY,
  } as const

  const handler = (req: Request, res: Response, next: NextFunction): void => {
    const issues: ValidationIssue[] = []
    const parsed: Partial<Record<keyof typeof parts, unknown>> = {}

    for (const location of ['body', 'params', 'query'] as const) {
      // express.json leaves req.body undefined when no JSON body was sent.
      const input = location === 'body' ? (req.body ?? {}) : req[location]
      const result = parts[location].safeParse(input)
      if (result.success) {
        parsed[location] = result.data
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join('.'), message: issue.message })
        }
      }
    }

    if (issues.length > 0) {
      res.status(400).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: issues.map((i) => `${i.location}${i.path ? `.${i.path}` : ''}: ${i.message}`).join('; '),
          details: issues,
        },
      })
      return
    }

    // Handlers and services only ever see the parsed, stripped values.
    req.body = parsed.body
    req.params = parsed.params as Request['params']
    req.query = parsed.query as Request['query']
    next()
  }

  return Object.assign(handler, { [VALIDATOR_MARK]: schema })
}
