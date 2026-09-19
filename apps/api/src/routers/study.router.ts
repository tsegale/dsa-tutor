import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getStudyStatus, recordConsent, withdrawParticipant, submitSus } from '../services/study.service'

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

router.post('/sus', async (req: AuthRequest, res: Response) => {
  try {
    const { responses } = req.body as { responses?: number[] }
    if (!Array.isArray(responses)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'responses (number[10]) is required' } })
      return
    }
    const result = await submitSus(req.userId!, responses)
    res.json({ data: result, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'NOT_A_PARTICIPANT') {
      res.status(403).json({ data: null, error: { code: 'NOT_A_PARTICIPANT', message: 'Not enrolled as a study participant' } })
      return
    }
    if (message === 'ALREADY_SUBMITTED') {
      res.status(409).json({ data: null, error: { code: 'ALREADY_SUBMITTED', message: 'SUS has already been submitted' } })
      return
    }
    if (message === 'INVALID_SUS_RESPONSES') {
      res.status(400).json({ data: null, error: { code: 'INVALID_SUS_RESPONSES', message: 'responses must be exactly 10 integers from 1 to 5' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record SUS response' } })
  }
})

export default router
