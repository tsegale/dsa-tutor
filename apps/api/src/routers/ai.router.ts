import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { proxyPrediction, proxyHint, proxyFeynman, proxyChallenge, proxyCodeEval } from '../services/ai.service'

const router = Router()
router.use(authenticate)

router.post('/predictions', async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyPrediction(req.body)
    res.json({ data: result, error: null })
  } catch {
    res.status(502).json({ data: null, error: { code: 'AI_SERVICE_ERROR', message: 'AI service unavailable' } })
  }
})

router.post('/hints', async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyHint(req.body)
    res.json({ data: result, error: null })
  } catch {
    res.status(502).json({ data: null, error: { code: 'AI_SERVICE_ERROR', message: 'AI service unavailable' } })
  }
})

router.post('/feynman', async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyFeynman(req.body)
    res.json({ data: result, error: null })
  } catch {
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Feynman evaluation unavailable' } })
  }
})

router.post('/challenges', async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyChallenge(req.body)
    res.json({ data: result, error: null })
  } catch {
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Challenge generation unavailable' } })
  }
})

router.post('/code-eval', async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyCodeEval(req.body)
    res.json({ data: result, error: null })
  } catch {
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Code evaluation unavailable' } })
  }
})

export default router
