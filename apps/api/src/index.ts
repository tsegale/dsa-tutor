import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { MisconceptionCategory, type SessionSummary } from '@dsa-tutor/types'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dsa-tutor-api' })
})

// Placeholder in-memory example endpoint demonstrating the shared
// SessionSummary type — replace with Prisma-backed persistence.
app.get('/sessions/example', (_req, res) => {
  const example: SessionSummary = {
    sessionId: 'example',
    userId: 'example-user',
    algorithmName: 'bubble-sort',
    mode: 'DEMO',
    totalSteps: 0,
    correctPredictions: 0,
    incorrectPredictions: 0,
    hintsRequested: 0,
    misconceptionBreakdown: {
      [MisconceptionCategory.OFF_BY_ONE]: 0,
      [MisconceptionCategory.ORDER_OF_OPERATIONS]: 0,
      [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 0,
      [MisconceptionCategory.POINTER_CONFUSION]: 0,
      [MisconceptionCategory.BASE_CASE_OMISSION]: 0,
      [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 0,
    },
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    xpEarned: 0,
  }
  res.json(example)
})

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})
