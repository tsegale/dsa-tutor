import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import { exportMisconceptionsCsv, importMisconceptionRatings } from '../services/research.service'

const router = Router()
router.use(authenticate)
router.use(requireEducator)

router.get('/misconceptions.csv', async (req: AuthRequest, res: Response) => {
  try {
    const csv = await exportMisconceptionsCsv()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="misconceptions.csv"')
    res.send(csv)
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to export misconceptions' } })
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
