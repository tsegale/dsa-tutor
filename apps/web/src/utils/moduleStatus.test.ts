import { describe, expect, it } from 'vitest'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { MODULES, TOPIC_COMPLETE, getModule } from '@/config/curriculum'
import { moduleStatus, topicNumber, topicState, type TopicMastery } from './moduleStatus'

const t = (name: string, track: AlgorithmTrack, masteryPercent = 0): TopicMastery => ({ name, track, masteryPercent })
const linear = getModule('linear-structures')
const searching = getModule('searching')

/** Every topic of the curriculum, all at the given mastery unless overridden. */
const curriculum = (mastery: Record<string, number> = {}) =>
  MODULES.flatMap((module) => module.topics.map((name) => t(name, module.track, mastery[name] ?? 0)))

describe('curriculum config', () => {
  it('numbers the six modules 1-6 in order, one per track', () => {
    expect(MODULES.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(MODULES.map((m) => m.track)).size).toBe(6)
  })

  it('carries no prerequisite or unlock threshold on any module', () => {
    // Modules used to list prerequisites and an unlockCount, which gated
    // later modules. Ordering is all that is left; see nothingIsGated.test.
    for (const module of MODULES) {
      expect(Object.keys(module), `module ${module.number}`).not.toContain('prerequisites')
      expect(Object.keys(module), `module ${module.number}`).not.toContain('unlockCount')
    }
  })

  it('lists every topic exactly once across the six modules', () => {
    const all = MODULES.flatMap((module) => module.topics)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('moduleStatus reports progress, and only progress', () => {
  it('is available on a fresh account, whatever module it is', () => {
    const fresh = curriculum()
    for (const module of MODULES) {
      expect(moduleStatus(module, fresh).state, `module ${module.number}`).toBe('available')
    }
  })

  it('is in progress once any of its topics is started', () => {
    expect(moduleStatus(searching, curriculum({ 'linear-search': 30 })).state).toBe('in-progress')
  })

  it('is complete when every topic reaches TOPIC_COMPLETE', () => {
    const all = Object.fromEntries(searching.topics.map((name) => [name, 100]))
    expect(moduleStatus(searching, curriculum(all)).state).toBe('complete')
  })

  it('counts a topic complete at exactly TOPIC_COMPLETE', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, TOPIC_COMPLETE)])
    expect(status).toMatchObject({ complete: 1, total: 1, state: 'complete' })
  })

  it('does not count a topic below TOPIC_COMPLETE', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, TOPIC_COMPLETE - 1)])
    expect(status).toMatchObject({ complete: 0, state: 'in-progress' })
  })

  it('reports the mean mastery of its own visible topics', () => {
    const status = moduleStatus(linear, [
      t('array-access', AlgorithmTrack.FOUNDATIONS, 100),
      t('array-insert', AlgorithmTrack.FOUNDATIONS, 0),
    ])
    expect(status.mean).toBe(50)
  })

  it('ignores a stale row on the module track that the module does not list', () => {
    const status = moduleStatus(linear, [t('array-access', AlgorithmTrack.FOUNDATIONS, 100), t('linked-list', AlgorithmTrack.FOUNDATIONS, 0)])
    expect(status).toMatchObject({ total: 1, complete: 1, state: 'complete' })
  })

  it('reports an empty module as 0 of 0 rather than complete', () => {
    expect(moduleStatus(linear, [])).toMatchObject({ state: 'available', complete: 0, total: 0 })
  })

  it('sees a study participant one visible topic per module, all available', () => {
    const studyTopics = [t('bubble-sort', AlgorithmTrack.SORTING), t('binary-search', AlgorithmTrack.SEARCHING), t('bst', AlgorithmTrack.TREES)]
    for (const id of ['searching', 'sorting', 'hierarchical-structures']) {
      expect(moduleStatus(getModule(id), studyTopics).state).toBe('available')
    }
  })
})

describe('topicState', () => {
  it('reads mastery and nothing else', () => {
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, TOPIC_COMPLETE))).toBe('complete')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 40))).toBe('in-progress')
    expect(topicState(t('array-access', AlgorithmTrack.FOUNDATIONS, 0))).toBe('available')
  })

  it('does not depend on the module it sits in', () => {
    // It used to take the module's status, which is how a topic in a locked
    // module came back 'locked'. The signature no longer admits that.
    expect(topicState.length).toBe(1)
  })
})

describe('topicNumber', () => {
  it('numbers module.topic from 1', () => {
    expect(topicNumber({ number: 5 }, 17)).toBe('5.18')
  })
})
