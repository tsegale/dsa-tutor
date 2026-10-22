import { describe, expect, it } from 'vitest'
import { Difficulty, type AlgorithmTrack, type TopicDto, type TopicMastery } from '@dsa-tutor/types'
import seedSource from '../../../api/prisma/seed.ts?raw'
import { MODULES } from '@/config/curriculum'
import { feynmanAccess } from './feynmanAccess'
import { EMPTY_MASTERY } from './mastery'
import { moduleStatus, topicState } from './moduleStatus'
import { buildSyllabus } from './syllabus'
import { pipelineFor } from '@/config/pipeline'

/**
 * Nothing in the app withholds anything from the learner.
 *
 * This file used to be unlockingUnchanged.test.ts, guarding that mastery
 * never changed what the Phase 3.1A prerequisite rule opened. That rule is
 * gone - the supervisor asked for every lock removed - so the guard is
 * inverted: it now asserts there is no state, anywhere in the curriculum,
 * the pipeline or Feynman mode, that tells a learner they may not proceed.
 *
 * Driven from the real seeded catalogue rather than fixtures, so a topic
 * added to the seed with a lock on it fails here rather than in front of a
 * student. The one remaining "no" is NOT_OFFERED, which is a statement
 * about the topic (no rubric written, no code challenge) and not about the
 * learner, and Classic, which is the study's control condition.
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

const PROGRESS = [0, 40, 75, 100]
const OPEN_STATES = ['available', 'in-progress', 'complete']

const shape = (topics: TopicDto[]) =>
  buildSyllabus(topics).map((entry) => ({
    module: entry.module.number,
    state: entry.status.state,
    topics: entry.topics.map((t) => [t.topic.name, t.state]),
  }))

describe('the seeded catalogue', () => {
  it('reads the whole thing', () => {
    expect(SEEDED.length).toBeGreaterThanOrEqual(MODULES.reduce((sum, m) => sum + m.topics.length, 0))
  })

  it('seeds no topic with a lock on it', () => {
    expect(SEEDED.filter((topic) => topic.isLocked).map((topic) => topic.name)).toEqual([])
  })
})

describe('no topic is ever gated', () => {
  it('gives a fresh account every topic of every module', () => {
    const syllabus = buildSyllabus(SEEDED)
    expect(syllabus.length).toBe(MODULES.length)
    for (const module of syllabus) {
      expect(module.status.state, `module ${module.module.number}`).toBe('available')
      expect(module.topics.length, `module ${module.module.number}`).toBe(module.module.topics.length)
      for (const entry of module.topics) expect(entry.state, entry.topic.name).toBe('available')
    }
  })

  it('reports only progress states, at every level of progress', () => {
    const progressed = SEEDED.map((topic, index) => ({ ...topic, masteryPercent: PROGRESS[index % PROGRESS.length] }))
    for (const module of buildSyllabus(progressed)) {
      expect(OPEN_STATES, `module ${module.module.number}`).toContain(module.status.state)
      for (const entry of module.topics) expect(OPEN_STATES, entry.topic.name).toContain(entry.state)
    }
  })

  it('reads the same whatever the mastery status, since mastery gates nothing', () => {
    const progressed = SEEDED.map((topic, index) => ({ ...topic, masteryPercent: PROGRESS[index % PROGRESS.length] }))
    expect(shape(progressed.map((topic) => ({ ...topic, mastery: MASTERED })))).toEqual(shape(progressed))
  })

  it('ignores the API isLocked flag, so a stale true cannot gate a topic', () => {
    const flagged = SEEDED.map((topic) => ({ ...topic, isLocked: true }))
    expect(shape(flagged)).toEqual(shape(SEEDED))
    for (const topic of flagged) expect(topicState(topic), topic.name).toBe('available')
  })

  it('never puts a module in a state a learner cannot act on', () => {
    for (const module of MODULES) {
      expect(OPEN_STATES, `module ${module.number}`).toContain(moduleStatus(module, SEEDED).state)
    }
  })
})

describe('no stage of a topic waits on another', () => {
  it('offers every stage it can, for every seeded topic, before any work is done', () => {
    for (const topic of SEEDED) {
      const stages = pipelineFor({
        slug: topic.name,
        runCompletedHere: false,
        practiceCompleted: false,
        feynmanAvailable: feynmanAccess({ classic: false, hasRubric: true }).state === 'AVAILABLE',
        feynmanReason: null,
        classic: false,
      })
      for (const stage of stages) {
        expect(['DONE', 'AVAILABLE', 'NOT_OFFERED'], `${topic.name} / ${stage.id}`).toContain(stage.status)
      }
    }
  })

  it('gives a stage it does offer the same status whether or not a run is done', () => {
    const forTopic = (practiceCompleted: boolean) =>
      pipelineFor({
        slug: 'bubble-sort',
        runCompletedHere: practiceCompleted,
        practiceCompleted,
        feynmanAvailable: true,
        feynmanReason: null,
        classic: false,
      }).map((stage) => [stage.id, stage.status === 'DONE' ? 'AVAILABLE' : stage.status])
    expect(forTopic(false)).toEqual(forTopic(true))
  })
})

describe('Feynman mode', () => {
  it('is available without a completed run', () => {
    expect(feynmanAccess({ classic: false, hasRubric: true })).toEqual({ state: 'AVAILABLE', reason: null })
  })

  it('is withheld only for a topic with no rubric, and in Classic', () => {
    expect(feynmanAccess({ classic: false, hasRubric: false }).state).toBe('UNAVAILABLE')
    expect(feynmanAccess({ classic: true, hasRubric: true }).state).toBe('UNAVAILABLE')
  })
})
