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
