import type { AlgorithmTrack, TopicDto } from '@dsa-tutor/types'
import { TRACKS, getTrack } from '@/data/tracks'

// Curriculum order: tracks in TRACKS order, and within a track the order
// the API returns (topic.service.ts sorts by the seeded `order` column).
// Sorting is stable, so the API's within-track order survives.

const TRACK_INDEX = new Map(TRACKS.map((track, index) => [track.id, index]))

export function orderTopics<T extends Pick<TopicDto, 'track'>>(topics: readonly T[]): T[] {
  return [...topics].sort((a, b) => (TRACK_INDEX.get(a.track) ?? 99) - (TRACK_INDEX.get(b.track) ?? 99))
}

export function topicsInTrack<T extends Pick<TopicDto, 'track'>>(topics: readonly T[], track: AlgorithmTrack): T[] {
  return topics.filter((topic) => topic.track === track)
}

export interface TopicMatch<T> {
  topic: T
  trackName: string
}

type Searchable = Pick<TopicDto, 'displayName' | 'description' | 'track'>

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9*+\s]/g, ' ')

/**
 * Ranks topics against a query across display name, track name and
 * description. Every word of the query must match somewhere; a match at the
 * start of a word in the name ranks highest, then anywhere in the name, then
 * the track, then the description. Ties keep curriculum order. An empty
 * query returns every topic in curriculum order.
 */
export function searchTopics<T extends Searchable>(topics: readonly T[], query: string): TopicMatch<T>[] {
  const ordered = orderTopics(topics)
  const words = normalise(query).split(/\s+/).filter(Boolean)
  const withTrack = ordered.map((topic) => ({ topic, trackName: getTrack(topic.track).name }))
  if (words.length === 0) return withTrack

  const scored: { match: TopicMatch<T>; score: number; index: number }[] = []
  withTrack.forEach((match, index) => {
    const name = normalise(match.topic.displayName)
    const nameWords = name.split(/\s+/)
    const track = normalise(match.trackName)
    const description = normalise(match.topic.description)
    let score = 0
    for (const word of words) {
      if (nameWords.some((w) => w.startsWith(word))) score += 100
      else if (name.includes(word)) score += 60
      else if (track.startsWith(word)) score += 40
      else if (description.includes(word)) score += 10
      else return
    }
    scored.push({ match, score, index })
  })
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map((entry) => entry.match)
}

/**
 * A topic counts as complete at 80% mastery: the same line where the mastery
 * ring turns from brand to success, so "complete" and the green ring agree.
 */
export const MASTERED_AT = 80

export const isTopicComplete = (topic: Pick<TopicDto, 'masteryPercent'>) => topic.masteryPercent >= MASTERED_AT

export interface TrackProgress {
  total: number
  complete: number
  /** complete / total as 0-100; 0 for an empty track. */
  percent: number
}

export function trackProgress(topics: readonly Pick<TopicDto, 'masteryPercent'>[]): TrackProgress {
  const complete = topics.filter(isTopicComplete).length
  return { total: topics.length, complete, percent: topics.length ? Math.round((complete / topics.length) * 100) : 0 }
}

type Pickable = Pick<TopicDto, 'name' | 'track' | 'isLocked' | 'masteryPercent'>

/**
 * The topic a track card names as "next": the first unlocked topic not yet
 * started, else the first unlocked one not yet complete, else none (the
 * track is done, or everything left is locked).
 */
export function nextTopicIn<T extends Pickable>(trackTopics: readonly T[]): T | null {
  const open = trackTopics.filter((topic) => !topic.isLocked)
  return open.find((topic) => topic.masteryPercent === 0) ?? open.find((topic) => !isTopicComplete(topic)) ?? null
}

export type ContinueTarget<T> =
  | { kind: 'continue'; topic: T; startTime: string }
  | { kind: 'start'; topic: T }
  | { kind: 'done' }

/**
 * What Home's one prominent card offers. The latest unfinished session wins
 * if its topic is still one this user can see and open. Otherwise, start the
 * first open, incomplete topic in curriculum order (for a new learner, the
 * first Foundations topic; for a study participant, their first study topic).
 */
export function pickContinue<T extends Pickable>(
  topics: readonly T[],
  latest: { startTime: string; topic: { name: string } } | null | undefined,
): ContinueTarget<T> {
  const resumable = latest ? topics.find((topic) => topic.name === latest.topic.name && !topic.isLocked) : undefined
  if (resumable && latest) return { kind: 'continue', topic: resumable, startTime: latest.startTime }
  const next = orderTopics(topics).find((topic) => !topic.isLocked && !isTopicComplete(topic))
  return next ? { kind: 'start', topic: next } : { kind: 'done' }
}

/** "today", "yesterday", "3 days ago", or a date beyond a fortnight. */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
