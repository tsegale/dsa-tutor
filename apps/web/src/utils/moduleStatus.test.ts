import { describe, expect, it } from 'vitest'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { MODULES, TOPIC_COMPLETE, getModule } from '@/config/curriculum'
import { canOpen, isPreview, lockReason, moduleStatus, topicNumber, topicState, unmetLabel, type TopicMastery } from './moduleStatus'

const t = (name: string, track: AlgorithmTrack, masteryPercent = 0, isLocked = false): TopicMastery => ({ name, track, masteryPercent, isLocked })
const linear = getModule('linear-structures')
const searching = getModule('searching')
const techniques = getModule('algorithmic-techniques')

/** Every topic of the curriculum, all at the given mastery unless overridden. */
const curriculum = (mastery: Record<string, number> = {}) =>
  MODULES.flatMap((module) => module.topics.map((name) => t(name, module.track, mastery[name] ?? 0)))

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

  it('asks 3 complete topics of Module 1 and 2 of every other module', () => {
    expect(MODULES.map((m) => m.unlockCount)).toEqual([3, 2, 2, 2, 2, 2])
  })
})

describe('rule 1: a prerequisite is a count of complete topics', () => {
  it('locks Module 2 until 3 Module 1 topics are complete, and reports progress', () => {
    const two = curriculum({ 'array-access': 100, 'array-insert': TOPIC_COMPLETE })
    expect(moduleStatus(searching, two)).toMatchObject({ state: 'locked', unmet: { module: linear, required: 3, done: 2 } })
    const three = curriculum({ 'array-access': 100, 'array-insert': 60, stack: 90 })
    expect(moduleStatus(searching, three)).toMatchObject({ state: 'available', unmet: null })
  })

  it('does not count a topic below TOPIC_COMPLETE, however many are started', () => {
    const almost = curriculum({ 'array-access': 59, 'array-insert': 59, 'array-delete': 59, stack: 59 })
    expect(moduleStatus(searching, almost).unmet).toMatchObject({ done: 0 })
  })

  it('reports the first unmet prerequisite of several, in declared order', () => {
    const sortingDone = curriculum({ 'bubble-sort': 100, 'selection-sort': 100 })
    expect(moduleStatus(techniques, sortingDone).unmet?.module.id).toBe('searching')
  })

  it('treats a prerequisite with no visible topics as met (a study participant)', () => {
    const studyTopics = [t('bubble-sort', AlgorithmTrack.SORTING), t('binary-search', AlgorithmTrack.SEARCHING), t('bst', AlgorithmTrack.TREES)]
    for (const id of ['searching', 'sorting', 'hierarchical-structures']) {
      expect(moduleStatus(getModule(id), studyTopics).state).toBe('available')
    }
  })
})

describe('rule 2: a module with a started topic is never locked', () => {
  it('shows in progress, not locked, even with its prerequisite unmet', () => {
    const status = moduleStatus(searching, curriculum({ 'linear-search': 30 }))
    expect(status.state).toBe('in-progress')
    expect(status.unmet).not.toBeNull()
  })

  it('is complete when every topic reaches TOPIC_COMPLETE', () => {
    const all = Object.fromEntries(searching.topics.map((name) => [name, 100]))
    expect(moduleStatus(searching, curriculum(all)).state).toBe('complete')
  })

  it('ignores a stale row on the module track that the module does not list', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 100), t('linked-list', AlgorithmTrack.FOUNDATIONS, 0)])
    expect(status).toMatchObject({ total: 1, complete: 1, state: 'complete' })
  })

  it('reports an empty module as 0 of 0 rather than complete', () => {
    expect(moduleStatus(linear, [])).toMatchObject({ state: 'available', complete: 0, total: 0 })
  })
})

describe('rule 3: the first topic of every module is open', () => {
  const fresh = curriculum()

  it('on a fresh account, opens all of Module 1 and the first topic of every other module', () => {
    const open = MODULES.flatMap((module) => {
      const status = moduleStatus(module, fresh)
      return fresh.filter((topic) => module.topics.includes(topic.name) && topicState(topic, status, module) !== 'locked')
    })
    expect(open).toHaveLength(14 + 5)
    expect(open.filter((topic) => topic.track !== AlgorithmTrack.FOUNDATIONS).map((topic) => topic.name)).toEqual([
      'linear-search',
      'bubble-sort',
      'two-pointer',
      'bst',
      'bfs',
    ])
  })

  it('labels the first topic of a locked module as a preview, and only that one', () => {
    const status = moduleStatus(searching, fresh)
    expect(isPreview(t('linear-search', AlgorithmTrack.SEARCHING), status, searching)).toBe(true)
    expect(isPreview(t('binary-search', AlgorithmTrack.SEARCHING), status, searching)).toBe(false)
    expect(isPreview(t('array-access', AlgorithmTrack.FOUNDATIONS), moduleStatus(linear, fresh), linear)).toBe(false)
  })
})

describe('topicState, canOpen and copy', () => {
  const lockedStatus = moduleStatus(searching, curriculum())

  it('marks complete at TOPIC_COMPLETE, and an API-locked topic always locked', () => {
    const open = moduleStatus(linear, curriculum())
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 60), open, linear)).toBe('complete')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 40), open, linear)).toBe('in-progress')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 100, true), open, linear)).toBe('locked')
  })

  it('opens soft-locked topics; under hard locks only the preview opens; never an API lock', () => {
    expect(canOpen(t('binary-search', AlgorithmTrack.SEARCHING), lockedStatus, searching, false)).toBe(true)
    expect(canOpen(t('binary-search', AlgorithmTrack.SEARCHING), lockedStatus, searching, true)).toBe(false)
    expect(canOpen(t('linear-search', AlgorithmTrack.SEARCHING), lockedStatus, searching, true)).toBe(true)
    expect(canOpen(t('linear-search', AlgorithmTrack.SEARCHING, 0, true), lockedStatus, searching, false)).toBe(false)
  })

  it('states the requirement in one line, with progress', () => {
    const unmet = { module: linear, required: 3, done: 1 }
    expect(unmetLabel(unmet)).toBe('Complete 3 topics in Module 1 to unlock (1 done)')
    expect(unmetLabel({ ...unmet, required: 1 })).toBe('Complete 1 topic in Module 1 to unlock (1 done)')
    expect(lockReason({ isLocked: false }, { state: 'locked', unmet })).toBe('Complete 3 topics in Module 1 to unlock (1 done).')
    expect(lockReason({ isLocked: false }, { state: 'in-progress', unmet })).toBeNull()
  })
})

describe('topicNumber', () => {
  it('numbers module.topic from 1', () => {
    expect(topicNumber({ number: 5 }, 17)).toBe('5.18')
  })
})
