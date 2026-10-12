import { describe, expect, it } from 'vitest'
import { AlgorithmTrack, Difficulty, type TopicDto } from '@dsa-tutor/types'
import { buildSyllabus, defaultExpandedModule, expandedStorageKey, moduleOfTopic, readExpanded, writeExpanded } from './syllabus'

const topic = (name: string, track: AlgorithmTrack, masteryPercent = 0, isLocked = false): TopicDto => ({
  id: name,
  name,
  displayName: name,
  track,
  difficulty: Difficulty.BEGINNER,
  description: '',
  estimatedMinutes: 5,
  isLocked,
  masteryPercent,
})

const FULL = [
  topic('array-access', AlgorithmTrack.FOUNDATIONS, 100),
  topic('stack', AlgorithmTrack.FOUNDATIONS, 0),
  topic('linear-search', AlgorithmTrack.SEARCHING, 0),
  topic('bubble-sort', AlgorithmTrack.SORTING, 30),
  topic('bst', AlgorithmTrack.TREES, 0),
]

describe('buildSyllabus', () => {
  it('lists modules in order with module.topic numbering', () => {
    const syllabus = buildSyllabus(FULL)
    expect(syllabus.map((m) => m.module.number)).toEqual([1, 2, 3, 5])
    expect(syllabus[0].topics.map((t) => t.number)).toEqual(['1.1', '1.2'])
    expect(syllabus[2].topics[0].number).toBe('3.1')
  })

  it('omits modules with no visible topics and keeps the real numbers for a participant', () => {
    const study = [topic('bubble-sort', AlgorithmTrack.SORTING), topic('binary-search', AlgorithmTrack.SEARCHING), topic('bst', AlgorithmTrack.TREES)]
    const syllabus = buildSyllabus(study)
    expect(syllabus.map((m) => `${m.module.number} ${m.status.total}`)).toEqual(['2 1', '3 1', '5 1'])
    expect(syllabus.every((m) => m.status.state !== 'locked')).toBe(true)
  })

  it('marks topics in a locked module as locked but still openable, with the reason', () => {
    // Module 1 mean is 50: below 60, so Searching, Sorting and Trees are locked.
    const searching = buildSyllabus(FULL).find((m) => m.module.id === 'searching')!
    expect(searching.status.state).toBe('locked')
    expect(searching.topics[0]).toMatchObject({ state: 'locked', openable: true, reason: 'Builds on Module 1: Linear structures. Reach 60% there to unlock.' })
  })

  it('never opens a topic the API locked', () => {
    const syllabus = buildSyllabus([topic('array-access', AlgorithmTrack.FOUNDATIONS, 0, true)])
    expect(syllabus[0].topics[0]).toMatchObject({ state: 'locked', openable: false })
  })
})

describe('defaultExpandedModule', () => {
  const syllabus = buildSyllabus(FULL)

  it('opens the module holding the focus topic', () => {
    expect(defaultExpandedModule(syllabus, 'bubble-sort')).toBe('sorting')
    expect(moduleOfTopic(syllabus, 'bst')?.module.number).toBe(5)
  })

  it('falls back to the first module that is not complete', () => {
    expect(defaultExpandedModule(syllabus, null)).toBe('linear-structures')
    expect(defaultExpandedModule(syllabus, 'no-such-topic')).toBe('linear-structures')
  })

  it('returns null for an empty syllabus', () => {
    expect(defaultExpandedModule([], 'x')).toBeNull()
  })
})

describe('expansion storage', () => {
  const memory = () => {
    const map = new Map<string, string>()
    return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
  }

  it('round-trips the expanded module ids per user', () => {
    const store = memory()
    const key = expandedStorageKey('user-1')
    writeExpanded(store, key, ['sorting', 'searching'])
    expect(readExpanded(store, key)).toEqual(['sorting', 'searching'])
    expect(readExpanded(store, expandedStorageKey('user-2'))).toBeNull()
  })

  it('falls back to null on garbage or blocked storage instead of throwing', () => {
    expect(readExpanded({ getItem: () => '{not json' }, 'k')).toBeNull()
    expect(readExpanded({ getItem: () => '[1, 2]' }, 'k')).toBeNull()
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readExpanded(blocked, 'k')).toBeNull()
    expect(() => writeExpanded(blocked, 'k', ['a'])).not.toThrow()
    expect(readExpanded(undefined, 'k')).toBeNull()
  })
})
