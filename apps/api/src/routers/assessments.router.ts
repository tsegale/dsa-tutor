import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getAssessmentStatus, startAttempt, submitResponse, completeAttempt } from '../services/assessment.service'

const router = Router()
router.use(authenticate)

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await getAssessmentStatus(req.userId!)
    res.json({ data: status, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load assessment status' } })
  }
})

router.post('/:code/start', async (req: AuthRequest, res: Response) => {
  try {
    const attempt = await startAttempt(req.userId!, req.params.code)
    res.json({ data: attempt, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'NOT_A_PARTICIPANT') {
      res.status(403).json({ data: null, error: { code: 'NOT_A_PARTICIPANT', message: 'Not enrolled as a study participant' } })
      return
    }
    if (message === 'UNKNOWN_ASSESSMENT') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_ASSESSMENT', message: 'No such assessment' } })
      return
    }
    if (message === 'POSTTEST_NOT_AVAILABLE') {
      res.status(403).json({ data: null, error: { code: 'POSTTEST_NOT_AVAILABLE', message: 'Study topics are not yet complete' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to start assessment' } })
  }
})

router.post('/attempts/:attemptId/responses', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, response, timeSpentSeconds } = req.body as {
      itemId?: string
      response?: string
      timeSpentSeconds?: number
    }
    if (!itemId || typeof response !== 'string' || typeof timeSpentSeconds !== 'number') {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'itemId, response, and timeSpentSeconds are required' } })
      return
    }
    // Server records the score; the client only ever gets an
    // acknowledgement back - no isCorrect/score field, so no answer
    // feedback can leak during or after the study.
    await submitResponse(req.userId!, req.params.attemptId, itemId, response, timeSpentSeconds)
    res.json({ data: { recorded: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'UNKNOWN_ATTEMPT' || message === 'UNKNOWN_ITEM') {
      res.status(404).json({ data: null, error: { code: message, message: 'Attempt or item not found' } })
      return
    }
    if (message === 'ATTEMPT_COMPLETED') {
      res.status(409).json({ data: null, error: { code: 'ATTEMPT_COMPLETED', message: 'This attempt is already complete' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record response' } })
  }
})

router.post('/attempts/:attemptId/complete', async (req: AuthRequest, res: Response) => {
  try {
    await completeAttempt(req.userId!, req.params.attemptId)
    res.json({ data: { completed: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'UNKNOWN_ATTEMPT') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_ATTEMPT', message: 'Attempt not found' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete assessment' } })
  }
})

export default router
