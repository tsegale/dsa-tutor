import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportAssessmentsCsv, exportInteractionsCsv, exportSessionsCsv } from './research.service'

const { db } = vi.hoisted(() => ({
  db: {
    assessmentResponse: { findMany: vi.fn() },
    session: { findMany: vi.fn() },
    interaction: { findMany: vi.fn() },
  },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

const consentAt = new Date('2026-09-29T08:00:00Z')
const after = new Date('2026-09-29T09:00:00Z')
const user = { participantCode: 'P02', consentAt, classicTopicSlug: 'binary-search' }

function parse(csv: string): Array<Record<string, string>> {
  const [head, ...lines] = csv.trim().split(/\r?\n/)
  const cols = head.split(',')
  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [cols[i], v.replace(/^"|"$/g, '')])))
}

beforeEach(() => vi.resetAllMocks())

describe('exports carry the condition (3B.7)', () => {
  it('assessments: condition from the item topic', async () => {
    db.assessmentResponse.findMany.mockResolvedValue([
      { score: 1, attempt: { user, assessment: { phase: 'PRE' } }, item: { conceptTag: 'A', topicSlug: 'binary-search' } },
      { score: 0, attempt: { user, assessment: { phase: 'PRE' } }, item: { conceptTag: 'B', topicSlug: 'bst' } },
    ])
    const rows = parse(await exportAssessmentsCsv())
    expect(rows.map((r) => [r.topicSlug, r.classicTopicSlug, r.condition])).toEqual([
      ['binary-search', 'binary-search', 'CLASSIC'],
      ['bst', 'binary-search', 'TUTOR'],
    ])
  })

  it('sessions: condition from the topic, completion by the session mode', async () => {
    const base = {
      mode: 'CLASSIC', startTime: after, endTime: null, mentalEffort: null, confidence: null,
      wallClockSeconds: null, activeSeconds: null, reachedFinalStep: true, _count: { interactions: 0 },
      user: { ...user, susScore: null, posttestOverrideAt: null, posttestOverrideIncompleteTopics: [] },
    }
    db.session.findMany.mockResolvedValue([{ ...base, algorithmTopic: { displayName: 'Binary Search', name: 'binary-search' } }])
    const [row] = parse(await exportSessionsCsv())
    expect(row.condition).toBe('CLASSIC')
    expect(row.classicTopicSlug).toBe('binary-search')
    expect(row.topicCompleteBySession).toBe('true')
  })

  it('interactions: condition per row', async () => {
    db.interaction.findMany.mockResolvedValue([
      {
        createdAt: after, interactionType: 'VIEW_STEP', criticalJunctionType: null, predictionCorrect: null,
        misconceptionCategory: null, aiMisconceptionCategory: null, hintsRequested: 0, hintIndexAtResolve: 0,
        bottomedOut: false, scaffoldingLevelAtTime: 'HIGH', masteryScoreAtTime: 0, timeSpentSeconds: 2, aiGenerated: false,
        aiFailureReason: null, aiLatencyMs: null, promptVersion: null, promptKey: null, rubricScore: null,
        rubricResults: null, feedbackText: null,
        session: { user, algorithmTopic: { displayName: 'Binary Search', name: 'binary-search' } },
      },
    ])
    const [row] = parse(await exportInteractionsCsv())
    expect(row.interactionType).toBe('VIEW_STEP')
    expect(row.condition).toBe('CLASSIC')
  })
})
