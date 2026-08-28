import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routers/auth.router'
import sessionsRouter from './routers/sessions.router'
import interactionsRouter from './routers/interactions.router'
import analyticsRouter from './routers/analytics.router'
import topicsRouter from './routers/topics.router'
import aiRouter from './routers/ai.router'

const app = express()

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
)

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' }, error: null })
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/sessions', sessionsRouter)
app.use('/api/v1/interactions', interactionsRouter)
app.use('/api/v1/analytics', analyticsRouter)
app.use('/api/v1/topics', topicsRouter)
app.use('/api/v1/ai', aiRouter)

app.use(errorHandler)

export default app
