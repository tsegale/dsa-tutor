import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getStudyStatus, recordConsent, withdrawParticipant } from '../services/study.service'

const router = Router()
router.use(authenticate)

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await getStudyStatus(req.userId!)
    res.json({ data: status, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load study status' } })
  }
})

router.post('/consent', async (req: AuthRequest, res: Response) => {
  try {
    await recordConsent(req.userId!)
    res.json({ data: { consented: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'NOT_A_PARTICIPANT') {
      res.status(403).json({ data: null, error: { code: 'NOT_A_PARTICIPANT', message: 'Not enrolled as a study participant' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record consent' } })
  }
})

router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    await withdrawParticipant(req.userId!)
    res.json({ data: { withdrawn: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'NOT_A_PARTICIPANT') {
      res.status(403).json({ data: null, error: { code: 'NOT_A_PARTICIPANT', message: 'Not enrolled as a study participant' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record withdrawal' } })
  }
})

export default router
