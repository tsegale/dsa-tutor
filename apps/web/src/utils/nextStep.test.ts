import { describe, expect, it } from 'vitest'
import { AlgorithmTrack, Difficulty, type TopicDto } from '@dsa-tutor/types'
import { EMPTY_MASTERY } from './mastery'
import { buildSyllabus, planNext } from './syllabus'
import { nextStep, whenPhrase } from './nextStep'

const topic = (name: string, track: AlgorithmTrack, masteryPercent = 0, displayName = name): TopicDto => ({
  id: name,
  name,
  displayName,
  track,
  difficulty: Difficulty.BEGINNER,
  description: '',
  estimatedMinutes: 5,
  isLocked: false,
  masteryPercent,
  mastery: EMPTY_MASTERY,
})

const NOW = new Date('2026-10-13T12:00:00')
const session = (name: string, startTime = '2026-10-11T09:00:00') => ({ startTime, topic: { name } })

describe('nextStep', () => {
  it('starts a new learner at the first topic and says why', () => {
    const plan = planNext(buildSyllabus([topic('array-access', AlgorithmTrack.FOUNDATIONS, 0, 'Array Access'), topic('stack', AlgorithmTrack.FOUNDATIONS)]), null)
    const step = nextStep(plan, null, NOW)
    expect(step).toMatchObject({ kind: 'start', action: 'Begin Array Access' })
    expect(step.kind === 'start' && step.reasoning).toBe('It is the first topic in Module 1: Linear structures, and what follows builds on it.')
  })

  it('resumes the open session with the recorded step and how far through it is', () => {
    const plan = planNext(buildSyllabus([topic('bubble-sort', AlgorithmTrack.SORTING, 40, 'Bubble Sort')]), session('bubble-sort'))
    const step = nextStep(plan, { topic: 'bubble-sort', step: 33, total: 52, at: '2026-10-11T10:00:00' }, NOW)
    expect(step).toMatchObject({ kind: 'resume', action: 'Resume Bubble Sort', position: { step: 33, total: 52 } })
    expect(step.kind === 'resume' && step.reasoning).toBe('You last worked on this 2 days ago and are 63% through.')
  })

  it('ignores a recorded position from a different topic', () => {
    const plan = planNext(buildSyllabus([topic('bubble-sort', AlgorithmTrack.SORTING, 40, 'Bubble Sort')]), session('bubble-sort'))
    const step = nextStep(plan, { topic: 'stack', step: 3, total: 9, at: '2026-10-12T10:00:00' }, NOW)
    expect(step).toMatchObject({ kind: 'resume', position: null })
    expect(step.kind === 'resume' && step.reasoning).toBe('You last worked on this 2 days ago, and your mastery is 40%.')
  })

  it('without an open session, names the plan topic after the furthest reached, never an earlier one', () => {
    const plan = planNext(buildSyllabus([topic('array-access', AlgorithmTrack.FOUNDATIONS, 0), topic('stack', AlgorithmTrack.FOUNDATIONS, 80, 'Stack'), topic('queue', AlgorithmTrack.FOUNDATIONS, 0, 'Queue')]), null)
    const step = nextStep(plan, null, NOW)
    expect(step).toMatchObject({ kind: 'next', action: 'Begin Queue' })
    expect(step.kind === 'next' && step.reasoning).toBe('It comes next after 1.7 Stack, the furthest you have reached.')
    expect(step.kind === 'next' && step.entry.topic.name).toBe(plan.recommended?.topic.name)
  })

  it('continues a started topic that is still the furthest', () => {
    const plan = planNext(buildSyllabus([topic('stack', AlgorithmTrack.FOUNDATIONS, 30, 'Stack')]), null)
    expect(nextStep(plan, null, NOW)).toMatchObject({ kind: 'next', action: 'Continue Stack', reasoning: 'You have started it and your mastery is 30%; it completes at 60%.' })
  })

  it('is done when nothing is left to open', () => {
    expect(nextStep(planNext(buildSyllabus([topic('stack', AlgorithmTrack.FOUNDATIONS, 90)]), null), null, NOW)).toEqual({ kind: 'done' })
  })
})

describe('whenPhrase', () => {
  it('reads naturally', () => {
    expect(whenPhrase('2026-10-13T08:00:00', NOW)).toBe('today')
    expect(whenPhrase('2026-10-12T08:00:00', NOW)).toBe('yesterday')
    expect(whenPhrase('2026-10-10T08:00:00', NOW)).toBe('3 days ago')
    expect(whenPhrase('2026-09-01T08:00:00', NOW)).toMatch(/^on /)
  })
})
