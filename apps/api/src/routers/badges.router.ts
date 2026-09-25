import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getUserBadges, awardBadge } from '../services/badge.service'
import { validate, type BodyOf } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)

router.get('/mine', validate(S.badges.mine), async (req: AuthRequest, res: Response) => {
  try {
    const badges = await getUserBadges(req.userId!)
    res.json({ data: badges, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch badges' } })
  }
})

router.post('/award', validate(S.badges.award), async (req: AuthRequest, res: Response) => {
  try {
    const { badgeName } = req.body as BodyOf<typeof S.badges.award>
    const result = await awardBadge(req.userId!, badgeName)
    res.json({ data: result, error: null })
  } catch (err: any) {
    if (err.message === 'UNKNOWN_BADGE') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_BADGE', message: 'No such badge' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to award badge' } })
  }
})

export default router
