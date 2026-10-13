import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getLearnerAnalytics } from '../services/learnerAnalytics.service'
import { savePreferences } from '../services/preferences.service'
import { deleteAccount } from '../services/account.service'
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

const DELETE_ERRORS: Record<string, [number, string]> = {
  INVALID_CREDENTIALS: [401, 'Your password is incorrect'],
  DEMO_ACCOUNT: [403, 'A demo account cannot be deleted'],
  EDUCATOR_ACCOUNT: [403, 'An educator account cannot be deleted from the profile'],
  NOT_FOUND: [404, 'User not found'],
}

// Delete the account and everything recorded for it (Phase 6E).
router.delete('/account', validate(S.profile.deleteAccount), async (req: AuthRequest, res: Response) => {
  try {
    await deleteAccount(req.userId!, req.body.password)
    res.json({ data: { deleted: true }, error: null })
  } catch (err) {
    const code = err instanceof Error ? err.message : ''
    const known = DELETE_ERRORS[code]
    if (known) {
      res.status(known[0]).json({ data: null, error: { code, message: known[1] } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not delete the account' } })
  }
})

export default router
