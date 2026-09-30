import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getStudyStatus, recordConsent, withdrawParticipant, submitSus, enrolParticipant, overridePosttest } from '../services/study.service'
import { validate, type BodyOf } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)

router.get('/status', validate(S.study.status), async (req: AuthRequest, res: Response) => {
  try {
    const status = await getStudyStatus(req.userId!)
    res.json({ data: status, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load study status' } })
  }
})

router.post('/enrol', validate(S.study.enrol), async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body as BodyOf<typeof S.study.enrol>
    const status = await enrolParticipant(req.userId!, code)
    res.json({ data: status, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'DEMO_ACCOUNT') {
      res.status(403).json({ data: null, error: { code: 'DEMO_ACCOUNT', message: 'Demo accounts cannot join the study. Register an account first.' } })
      return
    }
    if (message === 'INVALID_CODE') {
      res.status(400).json({ data: null, error: { code: 'INVALID_CODE', message: 'That code is not recognised' } })
      return
    }
    if (message === 'ENROLMENT_NOT_OPEN') {
      res.status(403).json({
        data: null,
        error: { code: 'ENROLMENT_NOT_OPEN', message: 'Enrolment is not open yet - please check with the researcher' },
      })
      return
    }
    if (message === 'CODE_TAKEN') {
      res.status(409).json({ data: null, error: { code: 'CODE_TAKEN', message: 'That code has already been claimed' } })
      return
    }
    if (message === 'ALREADY_ENROLLED') {
      res.status(409).json({ data: null, error: { code: 'ALREADY_ENROLLED', message: 'This account is already enrolled' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to enrol in the study' } })
  }
})

// A researcher's PIN lets a participant take the post-test without the
// topic-completion rule being met; the override is recorded. Repeated wrong
// PINs are throttled per account.
const overrideFailures = new Map<string, { count: number; since: number }>()
const OVERRIDE_MAX_FAILURES = 5
const OVERRIDE_WINDOW_MS = 15 * 60 * 1000

router.post('/posttest-override', validate(S.study.posttestOverride), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!
  const failures = overrideFailures.get(userId)
  if (failures && Date.now() - failures.since < OVERRIDE_WINDOW_MS && failures.count >= OVERRIDE_MAX_FAILURES) {
    res.status(429).json({ data: null, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts - try again later' } })
    return
  }
  try {
    const { pin } = req.body as BodyOf<typeof S.study.posttestOverride>
    const status = await overridePosttest(userId, pin)
    overrideFailures.delete(userId)
    res.json({ data: status, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'WRONG_PIN') {
      const current = failures && Date.now() - failures.since < OVERRIDE_WINDOW_MS ? failures : { count: 0, since: Date.now() }
      overrideFailures.set(userId, { count: current.count + 1, since: current.since })
      res.status(403).json({ data: null, error: { code: 'WRONG_PIN', message: 'That PIN is not correct' } })
      return
    }
    if (message === 'OVERRIDE_NOT_CONFIGURED') {
      res.status(503).json({ data: null, error: { code: 'OVERRIDE_NOT_CONFIGURED', message: 'Researcher override is not configured' } })
      return
    }
    if (message === 'NOT_A_PARTICIPANT') {
      res.status(403).json({ data: null, error: { code: 'NOT_A_PARTICIPANT', message: 'Not an active study participant' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record the override' } })
  }
})

router.post('/consent', validate(S.study.consent), async (req: AuthRequest, res: Response) => {
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

router.post('/withdraw', validate(S.study.withdraw), async (req: AuthRequest, res: Response) => {
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

router.post('/sus', validate(S.study.sus), async (req: AuthRequest, res: Response) => {
  try {
    const { responses } = req.body as BodyOf<typeof S.study.sus>
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
