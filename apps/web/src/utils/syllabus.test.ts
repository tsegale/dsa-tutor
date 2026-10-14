import { describe, expect, it } from 'vitest'
import { AlgorithmTrack, Difficulty, type TopicDto } from '@dsa-tutor/types'
import { EMPTY_MASTERY } from './mastery'
import { buildSyllabus, defaultExpandedModule, expandedStorageKey, moduleOfTopic, planNext, readExpanded, writeExpanded } from './syllabus'

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
  practiceRunCompleted: false,
  mastery: EMPTY_MASTERY,
})

const FULL = [
  topic('array-access', AlgorithmTrack.FOUNDATIONS, 100),
  topic('stack', AlgorithmTrack.FOUNDATIONS, 0),
  topic('linear-search', AlgorithmTrack.SEARCHING, 0),
  topic('bubble-sort', AlgorithmTrack.SORTING, 30),
  topic('bst', AlgorithmTrack.TREES, 0),
]

describe('buildSyllabus', () => {
  it('lists modules in order, numbering topics by their syllabus position', () => {
    const syllabus = buildSyllabus(FULL)
    expect(syllabus.map((m) => m.module.number)).toEqual([1, 2, 3, 5])
    // Stack is the seventh topic of Module 1, whatever else is visible.
    expect(syllabus[0].topics.map((t) => t.number)).toEqual(['1.1', '1.7'])
    expect(syllabus[2].topics[0].number).toBe('3.1')
  })

  it('keeps the real numbers for a participant who sees one topic per module', () => {
    const study = [topic('bubble-sort', AlgorithmTrack.SORTING), topic('binary-search', AlgorithmTrack.SEARCHING), topic('bst', AlgorithmTrack.TREES)]
    expect(buildSyllabus(study).flatMap((m) => m.topics.map((t) => `${t.number} ${t.topic.name}`))).toEqual(['2.2 binary-search', '3.1 bubble-sort', '5.1 bst'])
  })

  it('leaves out a topic no module lists, such as a stale linked-list row', () => {
    const syllabus = buildSyllabus([...FULL, topic('linked-list', AlgorithmTrack.FOUNDATIONS)])
    expect(syllabus[0].topics.map((t) => t.topic.name)).toEqual(['array-access', 'stack'])
  })

  it('omits modules with no visible topics and keeps the real numbers for a participant', () => {
    const study = [topic('bubble-sort', AlgorithmTrack.SORTING), topic('binary-search', AlgorithmTrack.SEARCHING), topic('bst', AlgorithmTrack.TREES)]
    const syllabus = buildSyllabus(study)
    expect(syllabus.map((m) => `${m.module.number} ${m.status.total}`)).toEqual(['2 1', '3 1', '5 1'])
    expect(syllabus.every((m) => m.status.state !== 'locked')).toBe(true)
  })

  it('opens a locked module only at its first topic, as a preview; the rest are locked but still openable', () => {
    // Three Module 1 topics visible, one complete, three needed: Searching is locked.
    const topics = [...FULL, topic('queue', AlgorithmTrack.FOUNDATIONS), topic('binary-search', AlgorithmTrack.SEARCHING)]
    const searching = buildSyllabus(topics).find((m) => m.module.id === 'searching')!
    expect(searching.status.state).toBe('locked')
    expect(searching.topics[0]).toMatchObject({ number: '2.1', state: 'available', preview: true, openable: true, reason: null })
    expect(searching.topics[1]).toMatchObject({
      number: '2.2',
      state: 'locked',
      preview: false,
      openable: true,
      reason: 'Complete 3 topics in Module 1 to unlock (1 done).',
    })
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

describe('planNext', () => {
  // Every topic of Modules 1-3, with the given mastery.
  const curriculum = (mastery: Record<string, number>) =>
    buildSyllabus(
      [
        ...['array-access', 'array-insert', 'array-delete', 'singly-linked-list', 'doubly-linked-list', 'circular-linked-list', 'stack', 'queue'].map((n) =>
          topic(n, AlgorithmTrack.FOUNDATIONS, mastery[n] ?? 0)
        ),
        ...['linear-search', 'binary-search'].map((n) => topic(n, AlgorithmTrack.SEARCHING, mastery[n] ?? 0)),
        ...['bubble-sort', 'selection-sort'].map((n) => topic(n, AlgorithmTrack.SORTING, mastery[n] ?? 0)),
      ]
    )
  const session = (name: string) => ({ startTime: '2026-10-13T10:00:00Z', topic: { name } })

  it('starts at 1.1 with no progress', () => {
    const plan = planNext(curriculum({}), null)
    expect(plan.recommended?.number).toBe('1.1')
    expect(plan.continue).toBeNull()
    expect(plan.furthest).toBeNull()
  })

  it('never points back before the furthest topic reached', () => {
    // Work on 1.7 Stack only: the answer is Stack itself (in progress), not 1.1.
    expect(planNext(curriculum({ stack: 40 }), null).recommended?.topic.name).toBe('stack')
    // Stack complete: the next one on, 1.8 Queue.
    expect(planNext(curriculum({ stack: 100 }), null).recommended?.topic.name).toBe('queue')
  })

  it('resumes the latest unfinished session when there is one', () => {
    const plan = planNext(curriculum({ stack: 40 }), session('stack'))
    expect(plan.continue?.entry.topic.name).toBe('stack')
    expect(plan.recommended?.topic.name).toBe('stack')
  })

  it('steps into a locked module only through its open preview', () => {
    // 1.8 Queue complete; Module 2 is locked (1 of 3), so 2.1 is its preview.
    expect(planNext(curriculum({ queue: 100 }), null).recommended).toMatchObject({ number: '2.1', preview: true })
  })

  it('skips a topic the API hard-locked', () => {
    const syllabus = buildSyllabus([topic('array-access', AlgorithmTrack.FOUNDATIONS, 0, true), topic('array-insert', AlgorithmTrack.FOUNDATIONS)])
    expect(planNext(syllabus, null).recommended?.topic.name).toBe('array-insert')
  })

  it('gives each module its own next topic by the same rule', () => {
    const plan = planNext(curriculum({ stack: 100 }), null)
    expect(plan.nextByModule.get('linear-structures')?.topic.name).toBe('queue')
    expect(plan.nextByModule.get('searching')?.topic.name).toBe('linear-search')
  })

  it('makes the module holding the open session name that session, so it never contradicts the banner', () => {
    // Resuming 1.1 while 1.8 Queue is the sequence's next: Module 1 names 1.1.
    const plan = planNext(curriculum({ stack: 100, 'array-access': 30 }), { startTime: '2026-10-13T09:00:00Z', topic: { name: 'array-access' } })
    expect(plan.focus?.topic.name).toBe('array-access')
    expect(plan.nextByModule.get('linear-structures')?.topic.name).toBe('array-access')
    // Other modules keep their own next topic.
    expect(plan.nextByModule.get('searching')?.topic.name).toBe('linear-search')
  })

  it('returns null rather than pointing backwards when nothing incomplete lies ahead', () => {
    const plan = planNext(curriculum({ 'selection-sort': 100 }), null)
    expect(plan.recommended).toBeNull()
  })
})

