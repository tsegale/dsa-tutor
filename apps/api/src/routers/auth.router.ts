import { Router, Request, Response } from 'express'
import { register, login } from '../services/auth.service'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
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

router.post('/login', async (req: Request, res: Response) => {
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

export default router
