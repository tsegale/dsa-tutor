import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import {
  detectOrEscalate,
  presentRemediation,
  completeRemediation,
  recordProbe,
  incrementJunctionsSinceDetection,
  checkStaleEventsOnSessionStart,
  getEventStatusForTopic,
  getDashboardSummary,
  nextRemediationLevel,
  toEventDto,
} from '../services/misconceptionEvent.service'
import { getEducatorMisconceptionSummary } from '../services/misconceptionReport.service'
import { validate, type BodyOf, type QueryOf } from '../middleware/validate'
import * as S from '../schemas/routes'
import { requireOwnership } from '../middleware/ownership'

const router = Router()
router.use(authenticate)

router.post('/detect', validate(S.misconceptionEvents.detect), requireOwnership({ in: 'body', key: 'detectedInteractionId' }), async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId, category, detectedInteractionId } = req.body as BodyOf<typeof S.misconceptionEvents.detect>
    const event = await detectOrEscalate(req.userId!, algorithmTopicId, category, detectedInteractionId)
    res.json({ data: { event: toEventDto(event), nextLevel: nextRemediationLevel(event.remediationCount) }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to detect misconception' } })
  }
})

router.post('/:eventId/remediations', validate(S.misconceptionEvents.presentRemediation), requireOwnership({ in: 'params', key: 'eventId' }), async (req: AuthRequest, res: Response) => {
  try {
    const { taskType, level, payload } = req.body as BodyOf<typeof S.misconceptionEvents.presentRemediation>
    const remediation = await presentRemediation(req.userId!, req.params.eventId, taskType, level, payload)
    res.json({ data: remediation, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'UNKNOWN_EVENT') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_EVENT', message: 'Event not found' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to present remediation' } })
  }
})

router.patch('/remediations/:remediationId', validate(S.misconceptionEvents.completeRemediation), requireOwnership({ in: 'params', key: 'remediationId' }), async (req: AuthRequest, res: Response) => {
  try {
    const { correct, skipped } = req.body as BodyOf<typeof S.misconceptionEvents.completeRemediation>
    const remediation = await completeRemediation(req.userId!, req.params.remediationId, {
      correct: correct ?? null,
      skipped: !!skipped,
    })
    res.json({ data: remediation, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'UNKNOWN_REMEDIATION') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_REMEDIATION', message: 'Remediation not found' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete remediation' } })
  }
})

router.post('/:eventId/probes', validate(S.misconceptionEvents.recordProbe),
  requireOwnership({ in: 'params', key: 'eventId' }, { in: 'body', key: 'interactionId' }),
  async (req: AuthRequest, res: Response) => {
  try {
    const { interactionId, junctionType, optionCount, correct, hintUsed } = req.body as BodyOf<typeof S.misconceptionEvents.recordProbe>
    const result = await recordProbe(
      req.userId!,
      req.params.eventId,
      interactionId,
      junctionType,
      optionCount,
      correct,
      !!hintUsed,
    )
    res.json({
      data: {
        event: toEventDto(result.event),
        shouldEscalate: result.shouldEscalate,
        nextLevel: nextRemediationLevel(result.event.remediationCount),
      },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'UNKNOWN_EVENT') {
      res.status(404).json({ data: null, error: { code: 'UNKNOWN_EVENT', message: 'Event not found' } })
      return
    }
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to record probe' } })
  }
})

router.post('/junction-tick', validate(S.misconceptionEvents.junctionTick), async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId } = req.body as BodyOf<typeof S.misconceptionEvents.junctionTick>
    await incrementJunctionsSinceDetection(req.userId!, algorithmTopicId)
    res.json({ data: { ok: true }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to advance junction count' } })
  }
})

router.post('/session-check', validate(S.misconceptionEvents.sessionCheck), async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId } = req.body as BodyOf<typeof S.misconceptionEvents.junctionTick>
    await checkStaleEventsOnSessionStart(req.userId!, algorithmTopicId)
    res.json({ data: { ok: true }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to check stale events' } })
  }
})

router.get('/status', validate(S.misconceptionEvents.status), async (req: AuthRequest, res: Response) => {
  try {
    const algorithmTopicId = (req.query as QueryOf<typeof S.misconceptionEvents.status>).algorithmTopicId
    const events = await getEventStatusForTopic(req.userId!, algorithmTopicId)
    res.json({ data: events.map(toEventDto), error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load event status' } })
  }
})

router.get('/summary', validate(S.misconceptionEvents.summary), async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getDashboardSummary(req.userId!)
    res.json({ data: summary, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load summary' } })
  }
})

router.get('/educator-summary', requireEducator, validate(S.misconceptionEvents.educatorSummary), async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getEducatorMisconceptionSummary()
    res.json({ data: summary, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load educator summary' } })
  }
})

export default router
