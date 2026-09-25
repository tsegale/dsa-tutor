import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logInteraction, getSessionInteractions } from '../services/interaction.service'
import { validate } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)

router.post('/', validate(S.interactions.create), async (req: AuthRequest, res: Response) => {
  try {
    const interaction = await logInteraction(req.body)
    res.status(201).json({ data: interaction, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to log interaction' } })
  }
})

router.get('/session/:sessionId', validate(S.interactions.listForSession), async (req: AuthRequest, res: Response) => {
  try {
    const interactions = await getSessionInteractions(req.params.sessionId)
    res.json({ data: interactions, error: null })
  } catch {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch interactions' } })
  }
})

export default router
