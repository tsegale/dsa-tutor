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
  ['binary-search', 75],
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

export interface DemoInteraction {
  stepIndex: number
  predictionCorrect: boolean
  timeSpentSeconds: number
  masteryScoreAtTime: number
  createdAt: Date
}

export interface DemoSession {
  topic: string
  startTime: Date
  endTime: Date | null
  completed: boolean
  reachedFinalStep: boolean
  activeSeconds: number
  interactions: DemoInteraction[]
}

const DAY_MS = 24 * 60 * 60 * 1000

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
      interactions.push({
        stepIndex: 2 + i * 3,
        predictionCorrect,
        timeSpentSeconds,
        masteryScoreAtTime: Math.round((correctSoFar / (i + 1)) * 100),
        createdAt: new Date(startTime.getTime() + elapsed * 1000),
      })
    }

    return {
      topic,
      startTime,
      endTime: isLatest ? null : new Date(startTime.getTime() + (elapsed + 60) * 1000),
      completed: !isLatest,
      reachedFinalStep: percent >= 60,
      activeSeconds: elapsed,
      interactions,
    }
  })
}
