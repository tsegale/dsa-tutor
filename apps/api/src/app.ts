import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import { requestId } from './lib/requestContext'
import { missingProductionEnv } from './config/requiredEnv'
import { checkAiService, checkDatabase } from './services/ops.service'
import { buildOpenApi, docsPage } from './lib/openapi'
import { validate } from './middleware/validate'
import * as S from './schemas/routes'
import authRouter from './routers/auth.router'
import sessionsRouter from './routers/sessions.router'
import interactionsRouter from './routers/interactions.router'
import analyticsRouter from './routers/analytics.router'
import topicsRouter from './routers/topics.router'
import aiRouter from './routers/ai.router'
import badgesRouter from './routers/badges.router'
import assessmentsRouter from './routers/assessments.router'
import researchRouter from './routers/research.router'
import studyRouter from './routers/study.router'
import misconceptionEventsRouter from './routers/misconceptionEvents.router'

const app = express()

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
)

// First, so every later handler and AI call runs inside the request's context.
app.use(requestId)
app.use(express.json())

// Reports unset required variables by name (never values), and whether the
// database and AI service answer, so an incomplete or broken deploy is
// visible with one curl. Always 200 while the api itself is up: Railway uses
// this as the api's healthcheck, and an AI outage must not get a healthy api
// restarted. "degraded" names what is wrong instead.
app.get('/health', async (req, res) => {
  const missingEnv = missingProductionEnv()
  const [database, aiService] = await Promise.all([checkDatabase(), checkAiService()])
  const status = database === 'ok' && aiService === 'ok' ? 'ok' : 'degraded'
  res.json({
    data: { status, config: missingEnv.length === 0 ? 'complete' : 'incomplete', missingEnv, database, aiService },
    error: null,
  })
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/sessions', sessionsRouter)
app.use('/api/v1/interactions', interactionsRouter)
app.use('/api/v1/analytics', analyticsRouter)
app.use('/api/v1/topics', topicsRouter)
app.use('/api/v1/ai', aiRouter)
app.use('/api/v1/badges', badgesRouter)
app.use('/api/v1/assessments', assessmentsRouter)
app.use('/api/v1/research', researchRouter)
app.use('/api/v1/study', studyRouter)
app.use('/api/v1/misconception-events', misconceptionEventsRouter)

// OpenAPI spec generated from the live route table and zod schemas (4D.3).
// Built once, on first request, when every router is registered.
const API_VERSION = '1.0.0'
let openApiSpec: Record<string, unknown> | null = null
app.get('/api/v1/docs/openapi.json', validate(S.docs.spec), (_req, res) => {
  openApiSpec ??= buildOpenApi(app, API_VERSION)
  res.json(openApiSpec)
})
app.get('/api/v1/docs', validate(S.docs.page), (_req, res) => {
  res.type('html').send(docsPage('/api/v1/docs/openapi.json'))
})

app.use(errorHandler)

export default app
