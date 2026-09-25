import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { createSession, updateSession, getSession, getLatestSession } from '../services/session.service'
import { updateStreak } from '../services/auth.service'
import { validate } from '../middleware/validate'
import * as S from '../schemas/routes'
import { requireOwnership } from '../middleware/ownership'

const router = Router()
router.use(authenticate)

router.post('/', validate(S.sessions.create), async (req: AuthRequest, res: Response) => {
  try {
    await updateStreak(req.userId!)
    const session = await createSession(req.userId!, req.body)
    res.status(201).json({ data: session, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' } })
  }
})

router.get('/', validate(S.sessions.list), async (req: AuthRequest, res: Response) => {
  try {
    if (req.query.latest !== 'true') {
      res.json({ data: null, error: null })
      return
    }
    const completed = req.query.completed === undefined ? undefined : req.query.completed === 'true'
    const session = await getLatestSession(req.userId!, completed)
    res.json({ data: session, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sessions' } })
  }
})

router.get('/:sessionId', validate(S.sessions.get), requireOwnership({ in: 'params', key: 'sessionId' }), async (req: AuthRequest, res: Response) => {
  try {
    const session = await getSession(req.params.sessionId, req.userId!)
    res.json({ data: session, error: null })
  } catch {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Session not found' } })
  }
})

router.patch('/:sessionId', validate(S.sessions.update), requireOwnership({ in: 'params', key: 'sessionId' }), async (req: AuthRequest, res: Response) => {
  try {
    const session = await updateSession(req.params.sessionId, req.userId!, req.body)
    res.json({ data: session, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update session' } })
  }
})

export default router
