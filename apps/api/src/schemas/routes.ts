import { z } from 'zod'
import type { RequestSchema } from '../middleware/validate'
import {
  category,
  id,
  junctionDifficulty,
  longText,
  nonNegativeInt,
  queryFlag,
  requiredJson,
  scaffoldingLevel,
  sessionMode,
  shortText,
} from './common'

// One schema per route, keyed the way the routers use them. A route with
// no body, params or query still gets an entry (an empty RequestSchema):
// validate() then rejects any body/params/query it was not built for.

const none: RequestSchema = {}

const nonEmpty = (max: number) => z.string().trim().min(1).max(max)

// ---------------------------------------------------------------- auth
// No `role` field anywhere: .strict() makes {"role":"EDUCATOR"} a 400 at
// the edge, before it can reach auth.service (which also never reads it).
export const auth = {
  register: {
    body: z.strictObject({ email: nonEmpty(254), password: nonEmpty(200), name: nonEmpty(100) }),
  },
  login: { body: z.strictObject({ email: nonEmpty(254), password: nonEmpty(200) }) },
  me: none,
  // Capped at 100: the largest single award the client makes is 50 (the
  // badge bonus). Without a ceiling any signed-in user could grant
  // themselves unlimited XP.
  xp: { body: z.strictObject({ amount: z.int().min(1).max(100) }) },
} satisfies Record<string, RequestSchema>

// ------------------------------------------------------------ sessions
const sessionIdParams = z.strictObject({ sessionId: id })

export const sessions = {
  create: {
    body: z.strictObject({ algorithmTopicId: id, mode: sessionMode, scaffoldingLevel }),
  },
  list: { query: z.strictObject({ latest: queryFlag.optional(), completed: queryFlag.optional() }) },
  get: { params: sessionIdParams },
  // Includes the session-end survey (mentalEffort 1-9 Paas scale,
  // confidence 1-5), matching SessionEndSurvey.tsx's own scales.
  update: {
    params: sessionIdParams,
    body: z.strictObject({
      endTime: z.iso.datetime().optional(),
      completed: z.boolean().optional(),
      scaffoldingLevel: scaffoldingLevel.optional(),
      challengeExplanation: longText.optional(),
      overallScore: z.number().min(0).max(100).optional(),
      conceptualScore: z.number().min(0).max(100).optional(),
      proceduralScore: z.number().min(0).max(100).optional(),
      totalPredictions: nonNegativeInt.optional(),
      correctPredictions: nonNegativeInt.optional(),
      mentalEffort: z.int().min(1).max(9).optional(),
      confidence: z.int().min(1).max(5).optional(),
    }),
  },
} satisfies Record<string, RequestSchema>

// -------------------------------------------------------- interactions
export const interactions = {
  create: {
    body: z.strictObject({
      sessionId: id,
      stepIndex: nonNegativeInt,
      predictionSubmitted: longText,
      predictionCorrect: z.boolean(),
      // Optional as well as nullable: it passes through two proxies before
      // reaching this body, and JSON.stringify drops an undefined value -
      // a strict required key here would silently lose study data.
      misconceptionCategory: category.nullable().optional(),
      hintsRequested: nonNegativeInt,
      timeSpentSeconds: z.number().min(0),
      criticalJunctionType: category.nullable().optional(),
      junctionDifficulty: junctionDifficulty.nullable().optional(),
      scaffoldingLevelAtTime: scaffoldingLevel.optional(),
      masteryScoreAtTime: z.number().optional(),
      interactionType: z.enum(['PREDICTION', 'FEYNMAN']).optional(),
      aiGenerated: z.boolean().optional(),
      feedbackText: longText.nullable().optional(),
      hintText: longText.nullable().optional(),
      counterfactualText: longText.nullable().optional(),
      aiMisconceptionCategory: category.nullable().optional(),
      bottomedOut: z.boolean().optional(),
      hintIndexAtResolve: nonNegativeInt.optional(),
      aiLatencyMs: z.number().min(0).nullable().optional(),
      aiModel: shortText.nullable().optional(),
      promptVersion: shortText.nullable().optional(),
      dataStructureStateSnapshot: z.unknown().optional(),
    }),
  },
  listForSession: { params: z.strictObject({ sessionId: id }) },
} satisfies Record<string, RequestSchema>

// ------------------------------------------------------ simple readers
export const analytics = { get: none } satisfies Record<string, RequestSchema>
export const topics = { list: none } satisfies Record<string, RequestSchema>

// ------------------------------------------------------------------ ai
const predictionBody = z.strictObject({
  algorithmName: nonEmpty(200),
  stepIndex: nonNegativeInt,
  currentState: z.unknown(),
  studentAnswer: longText.nullable(),
  errorHistory: z.array(shortText).max(50),
  scaffoldingLevel,
  sessionId: id,
  junctionType: category.nullable().optional(),
  junctionDifficulty: junctionDifficulty.nullable().optional(),
  groundTruthMisconception: category.nullable().optional(),
  pseudocode: longText.optional(),
})

export const ai = {
  predictions: { body: predictionBody },
  predictionsEvaluate: { body: predictionBody },
  predictionsStream: { body: predictionBody },
  hints: {
    body: z.strictObject({
      algorithmName: nonEmpty(200),
      stepIndex: nonNegativeInt,
      currentPredictionPrompt: longText,
      errorHistory: z.array(shortText).max(50),
      scaffoldingLevel,
      currentState: z.unknown().optional(),
      hintIndex: nonNegativeInt.optional(),
      pseudocode: longText.optional(),
    }),
  },
  feynman: {
    body: z.strictObject({
      algorithmName: nonEmpty(200),
      algorithmContext: longText,
      studentExplanation: longText,
      completionContext: longText,
      sessionId: id,
      stepDescriptions: z.array(longText).max(500).optional(),
    }),
  },
  challenges: {
    body: z.strictObject({
      algorithmName: nonEmpty(200),
      topMisconception: category.nullable(),
      difficulty: shortText,
      sessionHistory: z.record(z.string(), z.unknown()),
      arraySize: z.int().min(1).max(50).optional(),
    }),
  },
  codeEval: {
    body: z.strictObject({
      algorithmName: nonEmpty(200),
      currentArrayState: z.array(z.number()).max(200),
      activeIndices: z.array(nonNegativeInt).max(200),
      expectedNextState: z.array(z.number()).max(200),
      studentCode: longText,
      language: z.literal('python'),
      stepDescription: longText,
      actualResultingState: z.array(z.number()).max(200).nullable(),
      hasSyntaxError: z.boolean(),
      executionErrorMessage: longText.nullable(),
    }),
  },
  studentSummary: {
    body: z.strictObject({
      studentId: id,
      algorithmName: nonEmpty(200),
      totalSessions: nonNegativeInt,
      totalPredictions: nonNegativeInt,
      correctPredictions: nonNegativeInt,
      hintsRequested: nonNegativeInt,
      misconceptionBreakdown: z.record(z.string(), z.number()),
      scaffoldingProgression: z.array(shortText).max(1000),
      feynmanScores: z.array(z.number()).max(1000),
      averageTimePerStep: z.number().min(0),
    }),
  },
  classSummary: {
    body: z.strictObject({
      algorithmName: nonEmpty(200),
      totalStudents: nonNegativeInt,
      averageCorrectRate: z.number(),
      topMisconceptions: z.array(z.strictObject({ category, count: nonNegativeInt })).max(100),
      stepDifficultyHeatmap: z
        .array(z.strictObject({ stepIndex: nonNegativeInt, errorCount: nonNegativeInt }))
        .max(1000),
      scaffoldingDistribution: z.record(z.string(), z.number()),
    }),
  },
} satisfies Record<string, RequestSchema>

// -------------------------------------------------------------- badges
export const badges = {
  mine: none,
  award: { body: z.strictObject({ badgeName: nonEmpty(100) }) },
} satisfies Record<string, RequestSchema>

// --------------------------------------------------------- assessments
const attemptParams = z.strictObject({ attemptId: id })

export const assessments = {
  start: { params: z.strictObject({ code: nonEmpty(50) }) },
  submitResponse: {
    params: attemptParams,
    body: z.strictObject({ itemId: id, response: longText, timeSpentSeconds: z.number().min(0) }),
  },
  complete: { params: attemptParams },
} satisfies Record<string, RequestSchema>

// ------------------------------------------------------------ research
const exportQuery = { query: z.strictObject({ includePilot: queryFlag.optional() }) }

export const research = {
  export: exportQuery,
  // CSV uploads can be large; express.json's own body limit still applies.
  ratings: { body: z.strictObject({ csv: z.string().trim().min(1) }) },
} satisfies Record<string, RequestSchema>

// --------------------------------------------------------------- study
export const study = {
  status: none,
  enrol: { body: z.strictObject({ code: nonEmpty(50) }) },
  consent: none,
  withdraw: none,
  // Exactly ten 1-5 Likert answers. study.service re-checks this, which is
  // intentional: the service rule does not depend on this edge check.
  sus: { body: z.strictObject({ responses: z.array(z.int().min(1).max(5)).length(10) }) },
} satisfies Record<string, RequestSchema>

// ------------------------------------------------ misconception events
const topicBody = { body: z.strictObject({ algorithmTopicId: id }) }
const eventParams = z.strictObject({ eventId: id })

export const misconceptionEvents = {
  detect: {
    body: z.strictObject({ algorithmTopicId: id, category, detectedInteractionId: id }),
  },
  presentRemediation: {
    params: eventParams,
    body: z.strictObject({ taskType: nonEmpty(100), level: z.int().min(1).max(100), payload: requiredJson }),
  },
  completeRemediation: {
    params: z.strictObject({ remediationId: id }),
    body: z.strictObject({ correct: z.boolean().nullable().optional(), skipped: z.boolean().optional() }),
  },
  recordProbe: {
    params: eventParams,
    body: z.strictObject({
      interactionId: id,
      junctionType: category,
      optionCount: z.int().min(1).max(20),
      correct: z.boolean(),
      hintUsed: z.boolean().optional(),
    }),
  },
  junctionTick: topicBody,
  sessionCheck: topicBody,
  status: { query: z.strictObject({ algorithmTopicId: id }) },
  summary: none,
  educatorSummary: none,
} satisfies Record<string, RequestSchema>
