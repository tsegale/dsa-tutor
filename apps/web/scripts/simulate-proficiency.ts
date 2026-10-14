// Phase 7F: how many interactions a cold account needs to reach Proficient
// on Bubble Sort (first-attempt accuracy and breadth, apps/api
// config/mastery.ts), and whether that fits a 30 minute session.
//
// Simulated learners run the real engine, the real worked-example fading
// (utils/workedSteps.ts) and the real support gate (utils/masteryScore.ts,
// applied the way AlgorithmPage applies it after every reported answer).
// Each run uses a new random input, as the mastery panel's breadth offer
// suggests. The learner model and the per-step times are assumptions,
// printed with the result.
//
// Run from apps/web:
//   npx tsx --tsconfig tsconfig.app.json scripts/simulate-proficiency.ts
import { JunctionDifficulty, ScaffoldingLevel, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from '../src/engine/bubbleSort'
import { endsSegment, isWorkedStep } from '../src/utils/workedSteps'
import { calculateMastery, gateScaffoldingReduction, type MasteryMetrics } from '../src/utils/masteryScore'
import { rngFrom } from '../src/utils/challengeGenerators'

const LEARNERS = 2000
const MAX_RUNS = 20
// Mirrors MASTERY_RUBRIC in apps/api/src/config/mastery.ts.
const ACCURACY = { threshold: 85, window: 20, minAttempts: 10 }
const BREADTH = 3
// Assumed seconds per step: answering a junction (read, choose, feedback),
// a worked step (WORKED_STEP_DWELL_MS), and any other narrated step.
const SECONDS = { answer: 15, retry: 10, worked: 4.5, narration: 2.5 }

interface Learner {
  /** Chance a first attempt is right at the start, and its rise per answered junction. */
  start: number
  gain: number
}

function newMetrics(): MasteryMetrics {
  return { totalPredictions: 0, correctPredictions: 0, conceptualCorrect: 0, conceptualTotal: 0, proceduralCorrect: 0, proceduralTotal: 0, hintsRequested: 0, recentHintCounts: [], consecutiveCorrect: 0 }
}

function record(metrics: MasteryMetrics, correct: boolean, conceptual: boolean): MasteryMetrics {
  return {
    ...metrics,
    totalPredictions: metrics.totalPredictions + 1,
    correctPredictions: metrics.correctPredictions + (correct ? 1 : 0),
    conceptualTotal: metrics.conceptualTotal + (conceptual ? 1 : 0),
    conceptualCorrect: metrics.conceptualCorrect + (conceptual && correct ? 1 : 0),
    proceduralTotal: metrics.proceduralTotal + (conceptual ? 0 : 1),
    proceduralCorrect: metrics.proceduralCorrect + (!conceptual && correct ? 1 : 0),
    recentHintCounts: [...metrics.recentHintCounts, 0].slice(-5),
    consecutiveCorrect: correct ? metrics.consecutiveCorrect + 1 : 0,
  }
}

function proficient(firstAttempts: boolean[], inputs: number): boolean {
  const window = firstAttempts.slice(-ACCURACY.window)
  const right = window.filter(Boolean).length
  return window.length >= ACCURACY.minAttempts && Math.round((right / window.length) * 100) >= ACCURACY.threshold && inputs >= BREADTH
}

function simulate(learner: Learner, random: () => number) {
  let level: ScaffoldingLevel = ScaffoldingLevel.HIGH
  let metrics = newMetrics()
  const firstAttempts: boolean[] = []
  let interactions = 0
  let seconds = 0
  for (let run = 1; run <= MAX_RUNS; run++) {
    const length = 6 + Math.floor(random() * 5)
    const input = Array.from({ length }, () => 1 + Math.floor(random() * 20))
    const snapshots: AlgorithmSnapshot[] = bubbleSortEngine(input)
    let segmentLevel = level
    for (let i = 0; i < snapshots.length; i++) {
      const step = snapshots[i]
      if (!step.isPredictionRequired) {
        seconds += SECONDS.narration
        continue
      }
      if (isWorkedStep(snapshots, i, segmentLevel)) {
        seconds += SECONDS.worked
        continue
      }
      const conceptual = step.junctionDifficulty === JunctionDifficulty.CONCEPTUAL
      const chance = Math.min(0.97, learner.start + learner.gain * firstAttempts.length)
      const right = random() < chance
      firstAttempts.push(right)
      let attempts = [right]
      // A wrong first answer is retried, right with 0.8, up to the 3 attempt cap.
      while (!attempts.at(-1) && attempts.length < 3) attempts = [...attempts, random() < 0.8]
      for (const correct of attempts) {
        interactions += 1
        seconds += attempts.length === 1 || correct === attempts[0] ? SECONDS.answer : SECONDS.retry
        metrics = record(metrics, correct, conceptual)
        level = gateScaffoldingReduction(level, calculateMastery(metrics).recommendedLevel, metrics.consecutiveCorrect) as ScaffoldingLevel
      }
      if (endsSegment(snapshots, i)) segmentLevel = level
      if (proficient(firstAttempts, run)) return { reached: true, interactions, firstAttempts: firstAttempts.length, runs: run, minutes: seconds / 60 }
    }
  }
  return { reached: false, interactions, firstAttempts: firstAttempts.length, runs: MAX_RUNS, minutes: seconds / 60 }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))]

function report(label: string, learners: Learner[], seed: number) {
  const random = rngFrom(seed)
  const results = learners.map((learner) => simulate(learner, random))
  const reached = results.filter((r) => r.reached)
  const pick = (key: 'interactions' | 'firstAttempts' | 'runs' | 'minutes') => reached.map((r) => r[key])
  const within30 = reached.filter((r) => r.minutes <= 30).length
  console.log(`\n${label} (${learners.length} learners)`)
  console.log(`  reached Proficient within ${MAX_RUNS} runs: ${reached.length} (${Math.round((reached.length / learners.length) * 100)}%)`)
  if (reached.length === 0) return
  console.log(`  interactions: median ${median(pick('interactions'))}, 25th-75th ${quantile(pick('interactions'), 0.25)}-${quantile(pick('interactions'), 0.75)}`)
  console.log(`  first attempts: median ${median(pick('firstAttempts'))}`)
  console.log(`  runs: median ${median(pick('runs'))}`)
  console.log(`  minutes: median ${median(pick('minutes')).toFixed(1)}, 75th ${quantile(pick('minutes'), 0.75).toFixed(1)}; within 30 min: ${Math.round((within30 / learners.length) * 100)}% of all learners`)
}

const random = rngFrom(7)
const typical = Array.from({ length: LEARNERS }, () => ({ start: 0.55 + random() * 0.25, gain: 0.005 + random() * 0.015 }))
console.log('Assumed: first attempt right with chance start + gain x junctions answered (cap 0.97), start 0.55-0.80, gain 0.005-0.020;')
console.log(`retry right with 0.8; seconds per answer ${SECONDS.answer}, retry ${SECONDS.retry}, worked step ${SECONDS.worked}, other step ${SECONDS.narration}.`)
report('Typical learners', typical, 11)
report('A learner who never misses', [{ start: 1, gain: 0 }], 13)
