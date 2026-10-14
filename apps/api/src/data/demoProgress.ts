// The showcase demo account's progress (Phase 3.1E), as pure data plus a
// builder. scripts/seed-demo-account.ts writes what buildDemoProgress
// returns. Mastery on the topic list is computed from scored Interaction
// rows (topic.service.ts), so progress is seeded as Practice sessions with
// answered predictions, not as TopicMastery rows.
//
// The plan shows every module state the curriculum has (web
// utils/moduleStatus.ts, complete at 60%):
// - Module 1: largely complete (12 of 14), one topic in progress
// - Modules 2 and 3: partly done, one topic in progress each
// - Module 4: complete (its prerequisites, 2 topics in each of Modules 2
//   and 3, are met)
// - Module 5: available, nothing started (Module 1 has 3 or more complete)
// - Module 6: locked (needs 2 complete topics in Module 5)
//
// Seeded interactions carry no feedbackText, so they never enter the
// wrong-answer fallback rate (ops.service.ts), which counts only rows that
// displayed feedback.
//
// The mastery rubric (Phase 7B, config/mastery.ts) shows every status:
// Bubble Sort and Binary Search Mastered with all four criteria met (three
// inputs, a Feynman explanation at 80 or more, a passed challenge), Linear
// Search Proficient (its Feynman score is short of 80), Array Access
// Proficient (Feynman mode offered after its finished run, not yet taken),
// the rest in progress, and Modules 5 and 6 not started.

import type { MasteryRow } from '../config/mastery'

/** Topic slug and the mastery percent it should show. 0 means untouched. */
export const DEMO_PLAN: ReadonlyArray<readonly [string, number]> = [
  ['array-access', 95],
  ['array-insert', 90],
  ['array-delete', 85],
  ['singly-linked-list', 80],
  ['doubly-linked-list', 75],
  ['circular-linked-list', 70],
  ['stack', 90],
  ['queue', 85],
  ['circular-queue', 65],
  ['deque', 70],
  ['hash-table-chaining', 75],
  ['hash-table-probing', 65],
  ['recursion-factorial', 45],
  ['linear-search', 90],
  ['binary-search', 90],
  ['jump-search', 65],
  ['interpolation-search', 40],
  ['two-pointer', 80],
  ['sliding-window-fixed', 70],
  ['sliding-window-variable', 65],
  ['bubble-sort', 85],
  ['selection-sort', 80],
  ['insertion-sort', 70],
  ['shell-sort', 65],
  // Last on purpose: the one unfinished session, so Continue resumes it.
  ['merge-sort', 40],
]

/** Answered predictions per seeded session: percents are multiples of 5. */
export const PREDICTIONS_PER_TOPIC = 20

export type DemoLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

/** Topics practised on three different inputs (the breadth criterion); the rest on one. */
export const DEMO_THREE_INPUTS: readonly string[] = ['array-access', 'bubble-sort', 'binary-search', 'linear-search']
/** Feynman scores of 100, by topic. Linear Search's is short of the 80 Mastered needs. */
export const DEMO_FEYNMAN: Readonly<Record<string, number>> = { 'bubble-sort': 88, 'binary-search': 84, 'linear-search': 72 }
/** AI Challenge runs by topic: whether each was passed, and its first-attempt accuracy. */
export const DEMO_CHALLENGES: Readonly<Record<string, ReadonlyArray<{ caseId: string; passed: boolean; accuracy: number }>>> = {
  'bubble-sort': [{ caseId: 'reverse-sorted', passed: true, accuracy: 100 }],
  'binary-search': [
    { caseId: 'target-absent', passed: false, accuracy: 67 },
    { caseId: 'target-at-edge', passed: true, accuracy: 89 },
  ],
}

/** A logged row that is not a junction answer: a Feynman explanation or a challenge. */
export interface DemoExtra {
  interactionType: 'FEYNMAN' | 'CHALLENGE_ATTEMPT' | 'CHALLENGE_RESULT'
  stepIndex: number
  predictionCorrect: boolean | null
  promptKey: string
  rubricScore: number | null
  masteryScoreAtTime: number
  timeSpentSeconds: number
  createdAt: Date
}

export interface DemoInteraction {
  stepIndex: number
  predictionCorrect: boolean
  timeSpentSeconds: number
  masteryScoreAtTime: number
  /** The support level in force when this answer was given. */
  scaffoldingLevelAtTime: DemoLevel
  /** Every seeded answer is a first attempt. */
  attemptIndex: number
  /** Which input the run was on (config/mastery.ts breadth counts these). */
  inputHash: string
  createdAt: Date
}

// How support fades in the seeded runs, so the profile's trajectory chart
// shows the mechanism. Mirrors apps/web/src/utils/masteryScore.ts: the
// recommended level from the running score and streak, then the gate that
// steps support down one level at a time after a run of correct answers and
// restores it at once. Seeded answers use no hints.
const LEVELS: DemoLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE']
const STREAK_TO_STEP_DOWN: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = { HIGH: 3, MEDIUM: 4, LOW: 5 }

function recommendedLevel(score: number, streak: number): DemoLevel {
  if (score >= 80 && streak >= 5) return 'NONE'
  if (score >= 65) return 'LOW'
  if (score >= 45) return 'MEDIUM'
  return 'HIGH'
}

export function nextLevel(current: DemoLevel, score: number, streak: number): DemoLevel {
  const target = recommendedLevel(score, streak)
  const at = LEVELS.indexOf(current)
  if (LEVELS.indexOf(target) <= at) return target
  return current !== 'NONE' && streak >= STREAK_TO_STEP_DOWN[current] ? LEVELS[at + 1] : current
}

export interface DemoSession {
  topic: string
  startTime: Date
  endTime: Date | null
  completed: boolean
  reachedFinalStep: boolean
  activeSeconds: number
  /** The level the session ended at. */
  finalLevel: DemoLevel
  interactions: DemoInteraction[]
  /** Feynman and challenge rows, after the answers. */
  extras: DemoExtra[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** A stable 8-hex input hash per topic and input number, the shape the web logs. */
function demoInputHash(topic: string, input: number): string {
  let hash = 0x811c9dc5
  for (const char of `${topic}#${input}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** A small deterministic generator, so every re-seed writes the same data. */
function sequence(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

/**
 * One Practice session per planned topic, oldest first, spread across the
 * last three weeks. Wrong answers sit early in each run, as they would for a
 * learner who improves. The last topic's session is left open (no endTime,
 * not completed) and the rest are closed; only topics at 60% or more
 * reached the final step.
 */
export function buildDemoProgress(now: Date): DemoSession[] {
  const random = sequence(31)
  const planned = DEMO_PLAN.filter(([, percent]) => percent > 0)
  return planned.map(([topic, percent], index) => {
    const isLatest = index === planned.length - 1
    const daysAgo = isLatest ? 0 : Math.round(((planned.length - 1 - index) / (planned.length - 1)) * 21)
    const startTime = new Date(now.getTime() - daysAgo * DAY_MS - (isLatest ? 2 : 20) * 60 * 60 * 1000)
    const correctTotal = Math.round((percent / 100) * PREDICTIONS_PER_TOPIC)
    const wrongTotal = PREDICTIONS_PER_TOPIC - correctTotal

    let elapsed = 0
    let correctSoFar = 0
    const interactions: DemoInteraction[] = []
    // Every session starts at full support and fades as answers improve.
    let level: DemoLevel = 'HIGH'
    let streak = 0
    const inputs = DEMO_THREE_INPUTS.includes(topic) ? 3 : 1
    for (let i = 0; i < PREDICTIONS_PER_TOPIC; i++) {
      // A right answer grows likelier through the run, and the totals are
      // forced at the end so the topic lands exactly on its planned percent.
      const remaining = PREDICTIONS_PER_TOPIC - i
      const missesLeft = wrongTotal - (i - correctSoFar)
      const predictionCorrect =
        missesLeft <= 0 ? true : missesLeft >= remaining ? false : random() < 0.3 + 0.6 * (i / PREDICTIONS_PER_TOPIC)
      if (predictionCorrect) correctSoFar++
      const timeSpentSeconds = 8 + Math.floor(random() * 30)
      elapsed += timeSpentSeconds + 6
      const masteryScoreAtTime = Math.round((correctSoFar / (i + 1)) * 100)
      interactions.push({
        stepIndex: 2 + i * 3,
        predictionCorrect,
        timeSpentSeconds,
        masteryScoreAtTime,
        scaffoldingLevelAtTime: level,
        attemptIndex: 1,
        inputHash: demoInputHash(topic, Math.floor((i * inputs) / PREDICTIONS_PER_TOPIC)),
        createdAt: new Date(startTime.getTime() + elapsed * 1000),
      })
      streak = predictionCorrect ? streak + 1 : 0
      level = nextLevel(level, masteryScoreAtTime, streak)
    }

    const extras: DemoExtra[] = []
    const after = (seconds: number) => new Date(startTime.getTime() + (elapsed + seconds) * 1000)
    const feynman = DEMO_FEYNMAN[topic]
    if (feynman !== undefined) {
      extras.push({
        interactionType: 'FEYNMAN',
        stepIndex: 2 + PREDICTIONS_PER_TOPIC * 3,
        predictionCorrect: feynman >= 80,
        promptKey: `feynman.${topic.replace(/-/g, '_')}`,
        rubricScore: feynman,
        masteryScoreAtTime: feynman,
        timeSpentSeconds: 140,
        createdAt: after(20),
      })
    }
    for (const [k, run] of (DEMO_CHALLENGES[topic] ?? []).entries()) {
      const promptKey = `${topic}.${run.caseId}@${k + 1}`
      extras.push(
        { interactionType: 'CHALLENGE_ATTEMPT', stepIndex: 0, predictionCorrect: null, promptKey, rubricScore: null, masteryScoreAtTime: 0, timeSpentSeconds: 0, createdAt: after(30 + k * 300) },
        { interactionType: 'CHALLENGE_RESULT', stepIndex: 30, predictionCorrect: run.passed, promptKey, rubricScore: run.accuracy, masteryScoreAtTime: 0, timeSpentSeconds: 0, createdAt: after(240 + k * 300) },
      )
    }

    return {
      topic,
      extras,
      startTime,
      endTime: isLatest ? null : new Date(startTime.getTime() + (elapsed + 60) * 1000),
      completed: !isLatest,
      reachedFinalStep: percent >= 60,
      finalLevel: level,
      activeSeconds: elapsed,
      interactions,
    }
  })
}

/** A seeded session's rows as the mastery rubric reads them, oldest first. */
export function demoMasteryRows(session: DemoSession): MasteryRow[] {
  const answers: MasteryRow[] = session.interactions.map((i) => ({
    interactionType: 'PREDICTION',
    predictionCorrect: i.predictionCorrect,
    attemptIndex: i.attemptIndex,
    hintIndexAtResolve: 0,
    hintsRequested: 0,
    bottomedOut: false,
    inputHash: i.inputHash,
    promptKey: null,
    rubricScore: null,
    masteryScoreAtTime: i.masteryScoreAtTime,
    criticalJunctionType: null,
    createdAt: i.createdAt,
  }))
  const extras: MasteryRow[] = session.extras.map((e) => ({
    interactionType: e.interactionType,
    predictionCorrect: e.predictionCorrect,
    attemptIndex: null,
    hintIndexAtResolve: 0,
    hintsRequested: 0,
    bottomedOut: false,
    inputHash: null,
    promptKey: e.promptKey,
    rubricScore: e.rubricScore,
    masteryScoreAtTime: e.masteryScoreAtTime,
    criticalJunctionType: null,
    createdAt: e.createdAt,
  }))
  return [...answers, ...extras].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}
