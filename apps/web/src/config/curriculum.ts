import { AlgorithmTrack } from '@dsa-tutor/types'

// The curriculum as a syllabus: six numbered modules, each drawing on one
// existing track, with prerequisites between them. The single source of
// truth for module order, numbering, titles and gating. No database change:
// this is ordering, grouping and prerequisites over the topics the API
// already returns.

export interface Module {
  /** 1-6, displayed. */
  number: number
  id: string
  /** e.g. "Linear structures" */
  title: string
  /** One line: what the module covers. */
  subtitle: string
  /** The existing track this module draws its topics from. */
  track: AlgorithmTrack
  /** Module ids that must be met before this one opens. */
  prerequisites: string[]
  /** Mean mastery (%) across a prerequisite's topics needed to meet it. */
  threshold: number
  /**
   * The module's topics (API topic names) in syllabus order. Numbering comes
   * from here (index 0 is N.1), so a study participant who sees one topic of
   * a module still sees its real number. A topic the API returns that no
   * module lists (a stale database row) is not part of the curriculum.
   */
  topics: readonly string[]
}

/**
 * The one mastery line, used for three things that must agree:
 * - a prerequisite is met when its topics' mean mastery reaches it;
 * - a topic counts as complete (check marker, "N/M complete", Review) at it;
 * - a module is complete when every topic in it reaches it.
 * 60, not 80: requiring 80% across Module 1's 14 topics before any searching
 * topic opened would gate about eleven completions behind the second module,
 * too harsh for a 30-minute session.
 */
export const CURRICULUM_THRESHOLD = 60

/**
 * Soft locks by default: a locked topic is shown as locked, with its
 * prerequisite named, but still opens (the workspace shows a one-line
 * notice). Set true to gate for real. A topic the API marks isLocked is
 * always hard-locked, whatever this says.
 */
export const hardLocks = false

export const MODULES: readonly Module[] = [
  {
    number: 1,
    id: 'linear-structures',
    title: 'Linear structures',
    subtitle: 'Arrays, linked lists, stacks, queues, hash tables and recursion.',
    track: AlgorithmTrack.FOUNDATIONS,
    prerequisites: [],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'array-access',
      'array-insert',
      'array-delete',
      'singly-linked-list',
      'doubly-linked-list',
      'circular-linked-list',
      'stack',
      'queue',
      'circular-queue',
      'deque',
      'hash-table-chaining',
      'hash-table-probing',
      'recursion-factorial',
      'recursion-fibonacci',
    ],
  },
  {
    number: 2,
    id: 'searching',
    title: 'Searching',
    subtitle: 'Finding a value faster by exploiting order: halving, jumping and estimating.',
    track: AlgorithmTrack.SEARCHING,
    prerequisites: ['linear-structures'],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'linear-search',
      'binary-search',
      'jump-search',
      'interpolation-search',
      'exponential-search',
    ],
  },
  {
    number: 3,
    id: 'sorting',
    title: 'Sorting',
    subtitle: 'From adjacent swaps to divide and conquer to sorting without comparisons.',
    track: AlgorithmTrack.SORTING,
    prerequisites: ['linear-structures'],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'bubble-sort',
      'selection-sort',
      'insertion-sort',
      'shell-sort',
      'merge-sort',
      'quick-sort',
      'heap-sort',
      'counting-sort',
      'radix-sort',
    ],
  },
  {
    number: 4,
    id: 'algorithmic-techniques',
    title: 'Algorithmic techniques',
    subtitle: 'Two pointers and sliding windows: patterns that turn nested loops into one pass.',
    track: AlgorithmTrack.TECHNIQUES,
    prerequisites: ['searching', 'sorting'],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'two-pointer',
      'sliding-window-fixed',
      'sliding-window-variable',
    ],
  },
  {
    number: 5,
    id: 'hierarchical-structures',
    title: 'Hierarchical structures',
    subtitle: 'Search trees, traversals, self-balancing trees, heaps and tries.',
    track: AlgorithmTrack.TREES,
    prerequisites: ['linear-structures'],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'bst',
      'bst-search',
      'bst-delete',
      'tree-inorder',
      'tree-preorder',
      'tree-postorder',
      'tree-level-order',
      'avl-insert',
      'avl-delete',
      'rb-insert',
      'rb-delete',
      'max-heap-insert',
      'max-heap-delete',
      'min-heap-insert',
      'min-heap-delete',
      'trie-insert',
      'trie-search',
      'trie-delete',
    ],
  },
  {
    number: 6,
    id: 'graphs-and-networks',
    title: 'Graphs and networks',
    subtitle: 'Traversal, shortest paths, spanning trees and path-finding on grids and mazes.',
    track: AlgorithmTrack.GRAPHS,
    prerequisites: ['hierarchical-structures'],
    threshold: CURRICULUM_THRESHOLD,
    topics: [
      'bfs',
      'dfs',
      'dijkstra',
      'bellman-ford',
      'floyd-warshall',
      'kruskal',
      'prim',
      'cycle-detection',
      'connected-components',
      'topological-sort',
      'grid-bfs',
      'grid-dfs',
      'grid-dijkstra',
      'grid-astar',
      'maze-generation',
      'maze-prim',
      'maze-kruskal',
    ],
  },
]

const BY_ID = new Map(MODULES.map((module) => [module.id, module]))
const BY_TRACK = new Map(MODULES.map((module) => [module.track, module]))
const BY_NUMBER = new Map(MODULES.map((module) => [module.number, module]))
const BY_TOPIC = new Map(MODULES.flatMap((module) => module.topics.map((name, index) => [name, { module, index }] as const)))

export function getModule(id: string): Module {
  const module = BY_ID.get(id)
  if (!module) throw new Error(`Unknown module: ${id}`)
  return module
}

export function moduleForTrack(track: AlgorithmTrack): Module {
  const module = BY_TRACK.get(track)
  if (!module) throw new Error(`No module draws on track: ${track}`)
  return module
}

export function moduleByNumber(value: string | number | undefined): Module | null {
  const number = typeof value === 'string' ? Number(value) : value
  return number !== undefined && Number.isInteger(number) ? (BY_NUMBER.get(number) ?? null) : null
}

/** The module a topic belongs to and its 0-based position there, or null. */
export function placeOfTopic(name: string): { module: Module; index: number } | null {
  return BY_TOPIC.get(name) ?? null
}

/** Whether the syllabus lists this topic (a stale API row is not listed). */
export const isCurriculumTopic = (name: string) => BY_TOPIC.has(name)

/** "Module 3: Sorting" */
export const moduleLabel = (module: Module) => `Module ${module.number}: ${module.title}`
