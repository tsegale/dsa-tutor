import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getLearnerAnalytics } from '../services/learnerAnalytics.service'
import { savePreferences } from '../services/preferences.service'
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

router.put('/preferences', validate(S.profile.preferences), async (req: AuthRequest, res: Response) => {
  try {
    res.json({ data: await savePreferences(req.userId!, req.body), error: null })
  } catch (err) {
    const code = err instanceof Error ? err.message : ''
    if (code === 'STUDY_SETTINGS_FIXED') {
      res.status(403).json({ data: null, error: { code, message: 'Learning settings are fixed during the study' } })
      return
    }
    if (code === 'NOT_FOUND') {
      res.status(404).json({ data: null, error: { code, message: 'User not found' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not save your preferences' } })
  }
})

export default router
