import { describe, expect, it } from 'vitest'
import { summariseLearner, TRAJECTORY_SESSIONS, type ScoredInteraction } from './learnerAnalytics.service'

const STARTS: Record<string, string> = { s1: '2026-10-11T10:00:00Z', s2: '2026-10-12T10:00:00Z' }
const interaction = (sessionId: string, predictionCorrect: boolean | null, hintsRequested = 0, masteryScoreAtTime = 50, scaffoldingLevelAtTime = 'HIGH'): ScoredInteraction => ({
  sessionId,
  session: { startTime: new Date(STARTS[sessionId] ?? '2026-10-01T10:00:00Z'), topic: sessionId === 's2' ? 'Bubble Sort' : 'Stack' },
  predictionCorrect,
  hintsRequested,
  masteryScoreAtTime,
  scaffoldingLevelAtTime,
})

describe('summariseLearner', () => {
  const input = {
    topics: [
      // 90% is not Mastered by itself: the rubric decides (Phase 7B).
      { track: 'SORTING', masteryPercent: 90, isLocked: false, mastery: { status: 'PROFICIENT' as const } },
      { track: 'SORTING', masteryPercent: 60, isLocked: false, mastery: { status: 'MASTERED' as const } },
      { track: 'SORTING', masteryPercent: 30, isLocked: false, mastery: { status: 'IN_PROGRESS' as const } },
      { track: 'TREES', masteryPercent: 0, isLocked: false, mastery: { status: 'NOT_STARTED' as const } },
      { track: 'TREES', masteryPercent: 0, isLocked: true, mastery: { status: 'NOT_STARTED' as const } },
    ],
    interactions: [
      interaction('s1', true, 0, 100, 'HIGH'),
      interaction('s1', false, 2, 50, 'HIGH'),
      interaction('s2', true, 1, 67, 'MEDIUM'),
      interaction('s2', true, 0, 75, 'MEDIUM'),
      interaction('s2', null, 0, 75, 'MEDIUM'),
    ],
    practiceSeconds: 15_120,
    misconceptions: [
      { category: 'OFF_BY_ONE', status: 'RESOLVED', count: 2 },
      { category: 'OFF_BY_ONE', status: 'OPEN', count: 1 },
      { category: 'SWAP_DECISION', status: 'PERSISTENT', count: 1 },
    ],
    recentSessions: [
      { id: 's2', topic: 'Bubble Sort', mode: 'PRACTICE', startTime: new Date('2026-10-12T10:00:00Z'), activeSeconds: 600 },
      { id: 's1', topic: 'Stack', mode: 'DEMO', startTime: new Date('2026-10-11T10:00:00Z'), activeSeconds: null },
    ],
  }

  it('computes the summary row by hand-checkable rules', () => {
    expect(summariseLearner(input).summary).toEqual({
      // (90 + 60 + 30 + 0) / 4 unlocked topics = 45
      masteryIndex: 45,
      topicsTotal: 5,
      topicsStarted: 3,
      topicsCompleted: 2,
      topicsMastered: 1,
      practiceSeconds: 15_120,
      // The unanswered (null) row is not a prediction.
      predictions: 4,
      correctPredictions: 3,
      accuracy: 75,
      hintsUsed: 3,
      hintsPerPrediction: 0.75,
    })
  })

  it('groups modules by track, misconceptions by category, predictions by session', () => {
    const result = summariseLearner(input)
    expect(result.modules).toEqual([
      { track: 'SORTING', topics: 3, complete: 2, meanMastery: 60 },
      { track: 'TREES', topics: 2, complete: 0, meanMastery: 0 },
    ])
    expect(result.misconceptions).toEqual([
      { category: 'OFF_BY_ONE', detected: 3, resolved: 2, open: 1 },
      { category: 'SWAP_DECISION', detected: 1, resolved: 0, open: 1 },
    ])
    expect(result.recentSessions.map((s) => [s.id, s.predictions, s.correct])).toEqual([
      ['s2', 2, 2],
      ['s1', 2, 1],
    ])
  })

  it('charts each session as its own line, newest first, answered predictions only', () => {
    const trajectory = summariseLearner(input).trajectory
    expect(trajectory.map((t) => [t.sessionId, t.topic, t.points.map((p) => `${p.score}/${p.level}`)])).toEqual([
      ['s2', 'Bubble Sort', ['67/MEDIUM', '75/MEDIUM']],
      ['s1', 'Stack', ['100/HIGH', '50/HIGH']],
    ])
  })

  it('caps the trajectory at the most recent sessions', () => {
    const many = Array.from({ length: TRAJECTORY_SESSIONS + 3 }, (_, i) => ({
      ...interaction(`x${i}`, true),
      session: { startTime: new Date(Date.UTC(2026, 9, 1, i)), topic: `T${i}` },
    }))
    const trajectory = summariseLearner({ ...input, interactions: many }).trajectory
    expect(trajectory).toHaveLength(TRAJECTORY_SESSIONS)
    expect(trajectory[0].topic).toBe(`T${TRAJECTORY_SESSIONS + 2}`)
  })

  it('reports nulls, not zeros, for rates with no predictions', () => {
    const empty = summariseLearner({ ...input, interactions: [], misconceptions: [], recentSessions: [] })
    expect(empty.summary).toMatchObject({ predictions: 0, accuracy: null, hintsPerPrediction: null })
    expect(empty.trajectory).toEqual([])
    expect(empty.misconceptions).toEqual([])
  })
})
