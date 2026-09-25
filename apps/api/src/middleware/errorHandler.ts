import { Request, Response, NextFunction } from 'express'

// body-parser tags its own failures with a `type`; these are client errors
// (bad or oversized JSON), not server faults, so they must not surface as a
// 500 - the same 400 envelope validate() uses keeps clients on one shape.
type BodyParserError = Error & { type?: string }

export function errorHandler(err: BodyParserError, req: Request, res: Response, next: NextFunction): void {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON', details: [] },
    })
    return
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ data: null, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } })
    return
  }
  console.error(err.stack)
  res.status(500).json({
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  })
}
