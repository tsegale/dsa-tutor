import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  /** A "Try the demo" account (4D.6), from the token's demo claim. */
  isDemo?: boolean
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'No token provided' } })
    return
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string; demo?: boolean }
    req.userId = payload.userId
    req.userRole = payload.role
    req.isDemo = payload.demo === true
    next()
  } catch {
    res.status(401).json({ data: null, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } })
  }
}

export function requireEducator(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'EDUCATOR') {
    res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Educator role required' } })
    return
  }
  next()
}
