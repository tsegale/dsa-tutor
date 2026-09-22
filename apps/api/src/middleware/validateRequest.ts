import { Request, Response, NextFunction } from 'express'

// Rejects a request whose JSON body is missing any of the given fields.
// Kept intentionally small: this only checks presence, not shape/type -
// deeper validation belongs to the service layer via Prisma's own types.
export function requireFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((field) => req.body?.[field] === undefined)
    if (missing.length > 0) {
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: `Missing required field(s): ${missing.join(', ')}` },
      })
      return
    }
    next()
  }
}

// Rejects a body that is missing a required string field, has a field of the
// wrong type, or carries any field outside the allowed set. The unknown-field
// check is the important part here: it is the reason a client cannot smuggle
// a field like `role` into /auth/register and expect it to reach the service
// layer (see auth.dto.ts, which has no `role` field at all).
export function validateStringBody(requiredFields: string[], allowedFields: string[] = requiredFields) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body ?? {}

    const unknown = Object.keys(body).filter((key) => !allowedFields.includes(key))
    if (unknown.length > 0) {
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: `Unknown field(s): ${unknown.join(', ')}` },
      })
      return
    }

    const invalid = requiredFields.filter((field) => typeof body[field] !== 'string' || body[field].trim() === '')
    if (invalid.length > 0) {
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: `Missing or invalid field(s): ${invalid.join(', ')}` },
      })
      return
    }

    next()
  }
}
