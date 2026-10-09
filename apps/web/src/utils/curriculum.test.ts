import { describe, expect, it } from 'vitest'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { nextTopicIn, orderTopics, pickContinue, relativeDay, searchTopics, trackProgress } from './curriculum'

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
  it('puts tracks in curriculum order and keeps the API order inside a track', () => {
    expect(orderTopics(TOPICS).map((t) => t.displayName)).toEqual([
      'Array Access',
      'Queue',
      'Bubble Sort',
      'Binary Search',
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
    expect(trackProgress([t(80), t(79), t(100), t(0)])).toEqual({ total: 4, complete: 2, percent: 50 })
  })

  it('reports an empty track as 0 of 0 rather than dividing by zero', () => {
    expect(trackProgress([])).toEqual({ total: 0, complete: 0, percent: 0 })
  })
})

const pick = (name: string, track: AlgorithmTrack, masteryPercent = 0, isLocked = false) => ({ name, track, masteryPercent, isLocked })

describe('nextTopicIn', () => {
  it('prefers the first unstarted open topic', () => {
    const list = [pick('a', AlgorithmTrack.SORTING, 90), pick('b', AlgorithmTrack.SORTING, 40), pick('c', AlgorithmTrack.SORTING, 0)]
    expect(nextTopicIn(list)?.name).toBe('c')
  })

  it('falls back to the first started but incomplete topic', () => {
    const list = [pick('a', AlgorithmTrack.SORTING, 90), pick('b', AlgorithmTrack.SORTING, 40)]
    expect(nextTopicIn(list)?.name).toBe('b')
  })

  it('skips locked topics and returns null for a finished track', () => {
    expect(nextTopicIn([pick('a', AlgorithmTrack.SORTING, 0, true)])).toBeNull()
    expect(nextTopicIn([pick('a', AlgorithmTrack.SORTING, 100)])).toBeNull()
  })
})

describe('pickContinue', () => {
  const topics = [pick('bubble-sort', AlgorithmTrack.SORTING, 30), pick('array-access', AlgorithmTrack.FOUNDATIONS, 0)]
  const session = (name: string) => ({ startTime: '2026-10-08T10:00:00Z', topic: { name } })

  it('continues the latest unfinished session', () => {
    expect(pickContinue(topics, session('bubble-sort'))).toEqual({ kind: 'continue', topic: topics[0], startTime: '2026-10-08T10:00:00Z' })
  })

  it('starts the first open topic in curriculum order when there is no history', () => {
    expect(pickContinue(topics, null)).toEqual({ kind: 'start', topic: topics[1] })
  })

  it('ignores a session for a topic this user can no longer see', () => {
    expect(pickContinue(topics, session('dijkstra'))).toEqual({ kind: 'start', topic: topics[1] })
  })

  it('reports done when every open topic is complete', () => {
    expect(pickContinue([pick('a', AlgorithmTrack.SORTING, 100)], null)).toEqual({ kind: 'done' })
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
