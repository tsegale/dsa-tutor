import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import {
  exportMisconceptionsCsv,
  exportInteractionsCsv,
  exportAssessmentsCsv,
  exportSessionsCsv,
  exportMisconceptionEventsCsv,
  importMisconceptionRatings,
} from '../services/research.service'
import { validate, type BodyOf } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)
router.use(requireEducator)

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}

function includePilotFlag(req: AuthRequest): boolean {
  return req.query.includePilot === 'true'
}

router.get('/misconceptions.csv', validate(S.research.export), async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'misconceptions.csv', await exportMisconceptionsCsv(includePilotFlag(req)))
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export misconceptions' } })
  }
})

router.get('/interactions.csv', validate(S.research.export), async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'interactions.csv', await exportInteractionsCsv(includePilotFlag(req)))
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export interactions' } })
  }
})

router.get('/assessments.csv', validate(S.research.export), async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'assessments.csv', await exportAssessmentsCsv(includePilotFlag(req)))
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export assessments' } })
  }
})

router.get('/sessions.csv', validate(S.research.export), async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'sessions.csv', await exportSessionsCsv(includePilotFlag(req)))
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export sessions' } })
  }
})

router.get('/misconception_events.csv', validate(S.research.export), async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'misconception_events.csv', await exportMisconceptionEventsCsv(includePilotFlag(req)))
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export misconception events' } })
  }
})

router.post('/ratings', validate(S.research.ratings), async (req: AuthRequest, res: Response) => {
  try {
    const { csv } = req.body as BodyOf<typeof S.research.ratings>
    const result = await importMisconceptionRatings(csv)
    res.json({ data: result, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to import ratings' } })
  }
})

export default router
