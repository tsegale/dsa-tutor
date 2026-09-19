import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import {
  exportMisconceptionsCsv,
  exportInteractionsCsv,
  exportAssessmentsCsv,
  exportSessionsCsv,
  importMisconceptionRatings,
} from '../services/research.service'

const router = Router()
router.use(authenticate)
router.use(requireEducator)

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}

router.get('/misconceptions.csv', async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'misconceptions.csv', await exportMisconceptionsCsv())
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export misconceptions' } })
  }
})

router.get('/interactions.csv', async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'interactions.csv', await exportInteractionsCsv())
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export interactions' } })
  }
})

router.get('/assessments.csv', async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'assessments.csv', await exportAssessmentsCsv())
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export assessments' } })
  }
})

router.get('/sessions.csv', async (req: AuthRequest, res: Response) => {
  try {
    sendCsv(res, 'sessions.csv', await exportSessionsCsv())
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export sessions' } })
  }
})

router.post('/ratings', async (req: AuthRequest, res: Response) => {
  try {
    const { csv } = req.body as { csv?: string }
    if (typeof csv !== 'string' || csv.trim().length === 0) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BODY', message: 'csv (string) is required' } })
      return
    }
    const result = await importMisconceptionRatings(csv)
    res.json({ data: result, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to import ratings' } })
  }
})

export default router
