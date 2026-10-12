import { AlgorithmTrack } from '@dsa-tutor/types'
import { moduleForTrack } from '@/config/curriculum'

// The six tracks the curriculum modules draw on (config/curriculum.ts).
// Slugs, names and descriptions live here; order comes from module numbers,
// so tracks always list in syllabus order.
export interface TrackMeta {
  id: AlgorithmTrack
  /** URL segment: /track/:slug */
  slug: string
  name: string
  /** One line for the track card and the track page header. */
  description: string
}

const TRACK_LIST: TrackMeta[] = [
  {
    id: AlgorithmTrack.FOUNDATIONS,
    slug: 'foundations',
    name: 'Foundations',
    description: 'Arrays, linked lists, stacks, queues, hash tables and recursion: the structures everything else is built from.',
  },
  {
    id: AlgorithmTrack.SORTING,
    slug: 'sorting',
    name: 'Sorting',
    description: 'From adjacent swaps to divide and conquer to sorting without comparisons.',
  },
  {
    id: AlgorithmTrack.SEARCHING,
    slug: 'searching',
    name: 'Searching',
    description: 'Finding a value faster by exploiting order: halving, jumping and estimating.',
  },
  {
    id: AlgorithmTrack.TECHNIQUES,
    slug: 'techniques',
    name: 'Techniques',
    description: 'Two pointers and sliding windows: patterns that turn nested loops into one pass.',
  },
  {
    id: AlgorithmTrack.TREES,
    slug: 'trees',
    name: 'Trees',
    description: 'Search trees, traversals, self-balancing trees, heaps and tries.',
  },
  {
    id: AlgorithmTrack.GRAPHS,
    slug: 'graphs',
    name: 'Graphs',
    description: 'Traversal, shortest paths, spanning trees and path-finding on grids and mazes.',
  },
]

export const TRACKS: readonly TrackMeta[] = TRACK_LIST.sort((a, b) => moduleForTrack(a.id).number - moduleForTrack(b.id).number)

const BY_ID = new Map(TRACKS.map((track) => [track.id, track]))
const BY_SLUG = new Map(TRACKS.map((track) => [track.slug, track]))

export function getTrack(id: AlgorithmTrack): TrackMeta {
  const track = BY_ID.get(id)
  if (!track) throw new Error(`Unknown track: ${id}`)
  return track
}

export function getTrackBySlug(slug: string | undefined): TrackMeta | null {
  return slug ? (BY_SLUG.get(slug) ?? null) : null
}

export const trackPath = (id: AlgorithmTrack) => `/track/${getTrack(id).slug}`
// Practice, not Demo: Practice is the default the study argues for, and
// Demo stays one click away on the algorithm page (remediation doc 9.8).
export const topicPath = (topicName: string) => `/algorithm/${topicName}?mode=PRACTICE`
