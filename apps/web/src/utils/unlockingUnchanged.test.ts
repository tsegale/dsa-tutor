import { describe, expect, it } from 'vitest'
import { Difficulty, type AlgorithmTrack, type TopicDto, type TopicMastery } from '@dsa-tutor/types'
import seedSource from '../../../api/prisma/seed.ts?raw'
import { MODULES } from '@/config/curriculum'
import { EMPTY_MASTERY } from './mastery'
import { buildSyllabus } from './syllabus'

/**
 * Phase 7C: unlocking is the Phase 3.1A rule and nothing else. Mastery is a
 * badge, a filter and a progress signal; it never opens or closes a topic.
 * The topics here are the real seeded catalogue, as a fresh account gets it.
 */

const SEEDED = [...seedSource.matchAll(/\{ name: '([^']+)', displayName: '((?:[^'\\]|\\.)+)', track: '([A-Z]+)'[^}]*isLocked: (true|false)/g)].map(
  ([, name, displayName, track, isLocked]): TopicDto => ({
    id: name,
    name,
    displayName,
    track: track as AlgorithmTrack,
    difficulty: Difficulty.BEGINNER,
    description: '',
    estimatedMinutes: 5,
    isLocked: isLocked === 'true',
    masteryPercent: 0,
    practiceRunCompleted: false,
    mastery: EMPTY_MASTERY,
  }),
)

const MASTERED: TopicMastery = {
  ...EMPTY_MASTERY,
  status: 'MASTERED',
  criteria: EMPTY_MASTERY.criteria.map((criterion) => ({ ...criterion, met: true })),
  masteredAt: '2026-10-14T09:00:00.000Z',
}

const shape = (topics: TopicDto[]) =>
  buildSyllabus(topics).map((entry) => ({
    module: entry.module.number,
    state: entry.status.state,
    topics: entry.topics.map((t) => [t.topic.name, t.state, t.openable]),
  }))

describe('unlocking stays separate from mastery', () => {
  it('reads the whole seeded curriculum', () => {
    expect(SEEDED.length).toBeGreaterThanOrEqual(MODULES.reduce((sum, m) => sum + m.topics.length, 0))
  })

  it('gives a fresh account all of Module 1 and the first topic of every other module', () => {
    const [first, ...rest] = buildSyllabus(SEEDED)
    expect(first.module.number).toBe(1)
    for (const entry of first.topics) {
      expect(entry.state, entry.topic.name).toBe('available')
      expect(entry.openable, entry.topic.name).toBe(true)
    }
    expect(rest.length).toBe(MODULES.length - 1)
    for (const module of rest) {
      const opening = module.topics[0]
      expect(opening.topic.name).toBe(module.module.topics[0])
      expect(opening.state, opening.topic.name).toBe('available')
      expect(opening.openable, opening.topic.name).toBe(true)
    }
  })

  it('locks and unlocks exactly the same whatever the mastery status', () => {
    const progressed = SEEDED.map((topic, index) => ({ ...topic, masteryPercent: [0, 40, 75, 100][index % 4] }))
    const mastered = progressed.map((topic) => ({ ...topic, mastery: MASTERED }))
    expect(shape(mastered)).toEqual(shape(progressed))
    // A topic Mastered at 0% (stored masteredAt, no current percent) opens nothing either.
    expect(shape(SEEDED.map((topic) => ({ ...topic, mastery: MASTERED })))).toEqual(shape(SEEDED))
  })
})
