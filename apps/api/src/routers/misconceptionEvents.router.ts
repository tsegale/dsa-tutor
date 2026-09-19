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

const router = Router()
router.use(authenticate)

router.post('/detect', async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId, category, detectedInteractionId } = req.body as {
      algorithmTopicId?: string
      category?: string
      detectedInteractionId?: string
    }
    if (!algorithmTopicId || !category || !detectedInteractionId) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'algorithmTopicId, category, and detectedInteractionId are required' } })
      return
    }
    const event = await detectOrEscalate(req.userId!, algorithmTopicId, category, detectedInteractionId)
    res.json({ data: { event: toEventDto(event), nextLevel: nextRemediationLevel(event.remediationCount) }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to detect misconception' } })
  }
})

router.post('/:eventId/remediations', async (req: AuthRequest, res: Response) => {
  try {
    const { taskType, level, payload } = req.body as { taskType?: string; level?: number; payload?: unknown }
    if (!taskType || typeof level !== 'number' || payload === undefined) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'taskType, level, and payload are required' } })
      return
    }
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

router.patch('/remediations/:remediationId', async (req: AuthRequest, res: Response) => {
  try {
    const { correct, skipped } = req.body as { correct?: boolean | null; skipped?: boolean }
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

router.post('/:eventId/probes', async (req: AuthRequest, res: Response) => {
  try {
    const { interactionId, junctionType, optionCount, correct, hintUsed } = req.body as {
      interactionId?: string
      junctionType?: string
      optionCount?: number
      correct?: boolean
      hintUsed?: boolean
    }
    if (!interactionId || !junctionType || typeof optionCount !== 'number' || typeof correct !== 'boolean') {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'interactionId, junctionType, optionCount, and correct are required' } })
      return
    }
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

router.post('/junction-tick', async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId } = req.body as { algorithmTopicId?: string }
    if (!algorithmTopicId) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'algorithmTopicId is required' } })
      return
    }
    await incrementJunctionsSinceDetection(req.userId!, algorithmTopicId)
    res.json({ data: { ok: true }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to advance junction count' } })
  }
})

router.post('/session-check', async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmTopicId } = req.body as { algorithmTopicId?: string }
    if (!algorithmTopicId) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'algorithmTopicId is required' } })
      return
    }
    await checkStaleEventsOnSessionStart(req.userId!, algorithmTopicId)
    res.json({ data: { ok: true }, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to check stale events' } })
  }
})

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const algorithmTopicId = req.query.algorithmTopicId as string | undefined
    if (!algorithmTopicId) {
      res.status(400).json({ data: null, error: { code: 'INVALID_QUERY', message: 'algorithmTopicId is required' } })
      return
    }
    const events = await getEventStatusForTopic(req.userId!, algorithmTopicId)
    res.json({ data: events.map(toEventDto), error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load event status' } })
  }
})

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getDashboardSummary(req.userId!)
    res.json({ data: summary, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load summary' } })
  }
})

router.get('/educator-summary', requireEducator, async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getEducatorMisconceptionSummary()
    res.json({ data: summary, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load educator summary' } })
  }
})

export default router
