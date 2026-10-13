import { describe, expect, it } from 'vitest'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { MASTERED_AT, orderTopics, practiceAction, relativeDay, searchTopics, trackProgress } from './curriculum'

const topic = (displayName: string, track: AlgorithmTrack, description = '') => ({ displayName, track, description })

// API order: track alphabetical (as topic.service.ts returns it), then seed order.
const TOPICS = [
  topic('Breadth-First Search', AlgorithmTrack.GRAPHS, 'Explore a graph level by level using a queue.'),
  topic('Grid A*', AlgorithmTrack.GRAPHS, 'Heuristic path-finding on a grid.'),
  topic('Array Access', AlgorithmTrack.FOUNDATIONS, 'Read any element in constant time by index.'),
  topic('Queue', AlgorithmTrack.FOUNDATIONS, 'First in, first out.'),
  topic('Binary Search', AlgorithmTrack.SEARCHING, 'Halve a sorted array each step.'),
  topic('Bubble Sort', AlgorithmTrack.SORTING, 'Repeatedly compare and swap adjacent elements.'),
  topic('Binary Search Tree', AlgorithmTrack.TREES, 'Smaller values go left, larger go right.'),
]

const names = (list: { topic: { displayName: string } }[]) => list.map((m) => m.topic.displayName)

describe('orderTopics', () => {
  it('puts tracks in module order and keeps the API order inside a track', () => {
    // Module 2 is Searching and Module 3 Sorting (config/curriculum.ts).
    expect(orderTopics(TOPICS).map((t) => t.displayName)).toEqual([
      'Array Access',
      'Queue',
      'Binary Search',
      'Bubble Sort',
      'Binary Search Tree',
      'Breadth-First Search',
      'Grid A*',
    ])
  })
})

describe('searchTopics', () => {
  it('returns everything in curriculum order for an empty query', () => {
    expect(names(searchTopics(TOPICS, '  '))).toEqual(names(orderTopics(TOPICS).map((t) => ({ topic: t }))))
  })

  it('ranks a name-word prefix above a description match', () => {
    // "queue" is Queue's name and part of BFS's description.
    expect(names(searchTopics(TOPICS, 'queue'))).toEqual(['Queue', 'Breadth-First Search'])
  })

  it('requires every word to match', () => {
    expect(names(searchTopics(TOPICS, 'binary tree'))).toEqual(['Binary Search Tree'])
  })

  it('matches on the track name', () => {
    expect(names(searchTopics(TOPICS, 'sorting'))).toEqual(['Bubble Sort'])
  })

  it('ignores case and punctuation, and keeps symbols that are part of a name', () => {
    expect(names(searchTopics(TOPICS, 'BREADTH first'))).toEqual(['Breadth-First Search'])
    expect(names(searchTopics(TOPICS, 'a*'))).toContain('Grid A*')
  })

  it('reports the track name with each match', () => {
    expect(searchTopics(TOPICS, 'bubble')[0].trackName).toBe('Sorting')
  })

  it('returns nothing when no topic matches', () => {
    expect(searchTopics(TOPICS, 'zebra')).toEqual([])
  })
})

describe('trackProgress', () => {
  const t = (masteryPercent: number) => ({ masteryPercent })

  it('counts topics at or above the mastery line as complete', () => {
    expect(trackProgress([t(MASTERED_AT), t(MASTERED_AT - 1), t(100), t(0)])).toEqual({ total: 4, complete: 2, percent: 50 })
  })

  it('reports an empty track as 0 of 0 rather than dividing by zero', () => {
    expect(trackProgress([])).toEqual({ total: 0, complete: 0, percent: 0 })
  })
})


describe('relativeDay', () => {
  const now = new Date(2026, 9, 9, 15, 0)
  it('names recent days and falls back to a date', () => {
    expect(relativeDay(new Date(2026, 9, 9, 8, 0).toISOString(), now)).toBe('today')
    expect(relativeDay(new Date(2026, 9, 8, 23, 0).toISOString(), now)).toBe('yesterday')
    expect(relativeDay(new Date(2026, 9, 4, 12, 0).toISOString(), now)).toBe('5 days ago')
    expect(relativeDay(new Date(2026, 8, 1, 12, 0).toISOString(), now)).not.toMatch(/ago|today|yesterday/)
  })
})

describe('practiceAction', () => {
  it('says what practising does next, never a passive label', () => {
    expect(practiceAction({ state: 'available', topic: { masteryPercent: 0 } })).toBe('Begin practice')
    expect(practiceAction({ state: 'in-progress', topic: { masteryPercent: 30 } })).toBe('Continue practice')
    expect(practiceAction({ state: 'complete', topic: { masteryPercent: 85 } })).toBe('Review')
  })

  it('has no practice action while the module is locked', () => {
    expect(practiceAction({ state: 'locked', topic: { masteryPercent: 0 } })).toBeNull()
  })
})
