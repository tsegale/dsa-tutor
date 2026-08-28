import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getAllTopics } from '../services/topic.service'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const topics = await getAllTopics(req.userId!)
    res.json({ data: topics, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch topics' } })
  }
})

export default router
