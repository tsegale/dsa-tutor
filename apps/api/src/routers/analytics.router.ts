import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import { getEducatorAnalytics } from '../services/analytics.service'
import { validate } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)
router.use(requireEducator)

router.get('/', validate(S.analytics.get), async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await getEducatorAnalytics()
    res.json({ data: analytics, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } })
  }
})

export default router
