import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getLearnerAnalytics } from '../services/learnerAnalytics.service'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)

// The profile page's figures, all in one request (Phase 6C).
router.get('/analytics', validate(S.profile.analytics), async (req: AuthRequest, res: Response) => {
  try {
    res.json({ data: await getLearnerAnalytics(req.userId!), error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not load your analytics' } })
  }
})

export default router
