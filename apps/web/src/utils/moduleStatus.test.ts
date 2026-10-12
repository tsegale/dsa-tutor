import { describe, expect, it } from 'vitest'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { CURRICULUM_THRESHOLD, MODULES, getModule } from '@/config/curriculum'
import { canOpen, lockReason, moduleStatus, topicNumber, topicState, unmetLabel, type TopicMastery } from './moduleStatus'

const t = (name: string, track: AlgorithmTrack, masteryPercent = 0, isLocked = false): TopicMastery => ({ name, track, masteryPercent, isLocked })
const linear = getModule('linear-structures')
const searching = getModule('searching')
const techniques = getModule('algorithmic-techniques')

describe('curriculum config', () => {
  it('numbers the six modules 1-6 in order, one per track', () => {
    expect(MODULES.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(MODULES.map((m) => m.track)).size).toBe(6)
  })

  it('only points prerequisites at earlier modules', () => {
    for (const module of MODULES) {
      for (const id of module.prerequisites) expect(getModule(id).number).toBeLessThan(module.number)
    }
  })
})

describe('moduleStatus', () => {
  it('opens a module with no prerequisites, available until anything is started', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS), t('stack', AlgorithmTrack.FOUNDATIONS)])
    expect(status).toEqual({ state: 'available', mean: 0, complete: 0, total: 2, unmet: null })
  })

  it('is in progress once a topic has mastery, and complete when every topic reaches the threshold', () => {
    expect(moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 30), t('stack', AlgorithmTrack.FOUNDATIONS)]).state).toBe('in-progress')
    expect(moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 60), t('stack', AlgorithmTrack.FOUNDATIONS, 100)]).state).toBe('complete')
    expect(moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 59), t('stack', AlgorithmTrack.FOUNDATIONS, 100)]).state).toBe('in-progress')
  })

  it('locks while a prerequisite mean is below the threshold, and names it with its mean', () => {
    const topics = [t('array-access', AlgorithmTrack.FOUNDATIONS, 100), t('stack', AlgorithmTrack.FOUNDATIONS, 0), t('linear-search', AlgorithmTrack.SEARCHING)]
    const status = moduleStatus(searching, topics)
    expect(status.state).toBe('locked')
    expect(status.unmet).toEqual({ module: linear, mean: 50, threshold: CURRICULUM_THRESHOLD })
  })

  it('unlocks once the prerequisite mean reaches the threshold', () => {
    const topics = [t('array-access', AlgorithmTrack.FOUNDATIONS, 100), t('stack', AlgorithmTrack.FOUNDATIONS, 20), t('linear-search', AlgorithmTrack.SEARCHING)]
    expect(moduleStatus(searching, topics)).toMatchObject({ state: 'available', unmet: null })
  })

  it('reports the first unmet prerequisite of several, in declared order', () => {
    const topics = [t('linear-search', AlgorithmTrack.SEARCHING, 10), t('bubble-sort', AlgorithmTrack.SORTING, 90), t('two-pointer', AlgorithmTrack.TECHNIQUES)]
    expect(moduleStatus(techniques, topics).unmet?.module.id).toBe('searching')
  })

  it('treats a prerequisite with no visible topics as met (a study participant)', () => {
    const studyTopics = [t('bubble-sort', AlgorithmTrack.SORTING), t('binary-search', AlgorithmTrack.SEARCHING), t('bst', AlgorithmTrack.TREES)]
    for (const id of ['searching', 'sorting', 'hierarchical-structures']) {
      expect(moduleStatus(getModule(id), studyTopics).state).toBe('available')
    }
  })

  it('ignores a topic on the module track that the module does not list (a stale row)', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 100), t('linked-list', AlgorithmTrack.FOUNDATIONS, 0)])
    expect(status).toMatchObject({ total: 1, complete: 1, state: 'complete' })
  })

  it('reports an empty module as 0 of 0 rather than complete', () => {
    expect(moduleStatus(linear, [])).toMatchObject({ state: 'available', complete: 0, total: 0 })
  })
})

describe('topicState', () => {
  const open = moduleStatus(linear, [])
  const locked = { ...open, state: 'locked' as const }

  it('follows mastery in an open module', () => {
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 0), open, 60)).toBe('available')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 40), open, 60)).toBe('in-progress')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 60), open, 60)).toBe('complete')
  })

  it('shows locked in a locked module, unless the topic already reached the threshold', () => {
    expect(topicState(t('linear-search', AlgorithmTrack.SEARCHING, 40), locked, 60)).toBe('locked')
    expect(topicState(t('linear-search', AlgorithmTrack.SEARCHING, 70), locked, 60)).toBe('complete')
  })

  it('always shows an API-locked topic as locked', () => {
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 0, true), open, 60)).toBe('locked')
  })
})

describe('canOpen and lockReason', () => {
  const locked = { state: 'locked' as const, unmet: { module: linear, mean: 20, threshold: 60 } }

  it('opens a soft-locked topic, and refuses it under hard locks', () => {
    expect(canOpen({ isLocked: false }, locked, false)).toBe(true)
    expect(canOpen({ isLocked: false }, locked, true)).toBe(false)
  })

  it('never opens a topic the API locked', () => {
    expect(canOpen({ isLocked: true }, { state: 'available' }, false)).toBe(false)
  })

  it('names the prerequisite in plain language', () => {
    expect(lockReason({ isLocked: false }, locked)).toBe('Builds on Module 1: Linear structures. Reach 60% there to unlock.')
    expect(unmetLabel(locked.unmet)).toBe('Requires Module 1 at 60% (now 20%)')
    expect(lockReason({ isLocked: false }, { unmet: null })).toBeNull()
  })
})

describe('topicNumber', () => {
  it('numbers module.topic from 1', () => {
    expect(topicNumber({ number: 5 }, 17)).toBe('5.18')
  })
})
