import { Router, Request, Response } from 'express'
import { register, login } from '../services/auth.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateStringBody } from '../middleware/validateRequest'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/register', validateStringBody(['email', 'password', 'name']), async (req: Request, res: Response) => {
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

router.post('/login', validateStringBody(['email', 'password']), async (req: Request, res: Response) => {
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

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
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

router.post('/xp', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body as { amount: number }
    if (amount <= 0) {
      res.status(400).json({ data: null, error: { code: 'INVALID_AMOUNT', message: 'XP amount must be positive' } })
      return
    }
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
