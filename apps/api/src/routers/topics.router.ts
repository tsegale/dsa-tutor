import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getAllTopics } from '../services/topic.service'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const topics = await getAllTopics(req.userId!)
    // Per-user (masteryPercent is computed from this user's own
    // interactions), so this must stay private - a shared/CDN cache must
    // never serve one user's topics to another. A short max-age still
    // absorbs rapid duplicate requests (e.g. a remount shortly after
    // completing a practice session) without masking real mastery updates.
    res.set('Cache-Control', 'private, max-age=60')
    res.json({ data: topics, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch topics' } })
  }
})

export default router
