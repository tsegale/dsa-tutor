import { Router, Response } from 'express'
import { authenticate, requireEducator, AuthRequest } from '../middleware/auth'
import {
  proxyPrediction,
  proxyPredictionEvaluate,
  proxyHint,
  proxyFeynman,
  proxyChallenge,
  proxyCodeEval,
  proxyStudentSummary,
  proxyClassSummary,
} from '../services/ai.service'
import { validate } from '../middleware/validate'
import * as S from '../schemas/routes'

const router = Router()
router.use(authenticate)

router.post('/predictions', validate(S.ai.predictions), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyPrediction(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyPrediction failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_SERVICE_ERROR', message: 'AI service unavailable' } })
  }
})

router.post('/predictions/evaluate', validate(S.ai.predictionsEvaluate), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyPredictionEvaluate(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyPredictionEvaluate failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_SERVICE_ERROR', message: 'AI service unavailable' } })
  }
})

router.post('/hints', validate(S.ai.hints), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyHint(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyHint failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_SERVICE_ERROR', message: 'AI service unavailable' } })
  }
})

router.post('/feynman', validate(S.ai.feynman), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyFeynman(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyFeynman failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Feynman evaluation unavailable' } })
  }
})

router.post('/challenges', validate(S.ai.challenges), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyChallenge(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyChallenge failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Challenge generation unavailable' } })
  }
})

router.post('/code-eval', validate(S.ai.codeEval), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyCodeEval(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyCodeEval failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Code evaluation unavailable' } })
  }
})

// Educator-only: these narrate a named student's or the whole class's
// learning data for the educator dashboard, the only caller.
router.post('/summaries/student', requireEducator, validate(S.ai.studentSummary), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyStudentSummary(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyStudentSummary failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Summary unavailable' } })
  }
})

router.post('/summaries/class', requireEducator, validate(S.ai.classSummary), async (req: AuthRequest, res: Response) => {
  try {
    const result = await proxyClassSummary(req.body)
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('proxyClassSummary failed:', err)
    res.status(502).json({ data: null, error: { code: 'AI_ERROR', message: 'Class summary unavailable' } })
  }
})

export default router
