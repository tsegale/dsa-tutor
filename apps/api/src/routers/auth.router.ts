import { Router, Request, Response } from 'express'
import { register, login } from '../services/auth.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { validate, type BodyOf } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()

router.post('/register', validate(S.auth.register), async (req: Request, res: Response) => {
  try {
    const result = await register(req.body)
    res.status(201).json({ data: result, error: null })
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      res.status(409).json({ data: null, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } })
  }
})

router.post('/login', validate(S.auth.login), async (req: Request, res: Response) => {
  try {
    const result = await login(req.body)
    res.json({ data: result, error: null })
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      res
        .status(401)
        .json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } })
  }
})

router.get('/me', authenticate, validate(S.auth.me), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xpTotal: true,
        streakCount: true,
        lastActiveDate: true,
      },
    })
    res.json({ data: user, error: null })
  } catch {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } })
  }
})

router.post('/xp', authenticate, validate(S.auth.xp), async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body as BodyOf<typeof S.auth.xp>
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { xpTotal: { increment: amount } },
      select: { xpTotal: true },
    })
    res.json({ data: user, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update XP' } })
  }
})

export default router
