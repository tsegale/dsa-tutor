/**
 * The five stages a topic is worked through, and what each one offers on
 * each topic.
 *
 * This is the single source of truth for stage availability. The hands-on
 * category sets below used to live inside components/ui/ModeToggle.tsx,
 * private to it; the left panel's tracker needs the same answers, and two
 * copies of "does this topic have a hands-on interaction" would drift the
 * first time a canvas was added.
 *
 * Locked stages are shown, not hidden: the point of the tracker is that a
 * student can see the whole route through a topic from the moment they
 * open it, including the parts they have not reached.
 */

import { CODE_CHALLENGES, hasCodeChallenge } from '@/config/codeChallenges'
import { FEYNMAN_NO_RUBRIC_REASON } from '@/utils/feynmanAccess'

export type PipelineStageId = 'DEMO' | 'PRACTICE' | 'HANDS_ON' | 'CODE' | 'FEYNMAN'

export type StageStatus =
  /** Finished. */
  | 'DONE'
  /** Open now. */
  | 'AVAILABLE'
  /** Not offered on this topic at all, and never will be. */
  | 'NOT_OFFERED'

export interface PipelineStage {
  id: PipelineStageId
  label: string
  /** One line: what the student does in this stage. */
  summary: string
  status: StageStatus
  /** Why it is not offered. Null when it is open. */
  reason: string | null
}

// ---------------------------------------------------------------- hands-on

/** No physical construction gesture makes sense: pointer movement or
 *  recursion, not rearranging elements. */
export const NO_HANDS_ON = new Set([
  'recursion-factorial',
  'recursion-fibonacci',
  'binary-search',
  'linear-search',
  'jump-search',
  'interpolation-search',
  'exponential-search',
  'array-access',
  'two-pointer',
  'sliding-window-fixed',
  'sliding-window-variable',
  'prefix-sum',
  'monotonic-stack',
  'divide-and-conquer',
  'greedy',
  'dp-1d',
  'dp-2d',
  'backtracking',
  'floyd-warshall',
  'maze-generation',
  'maze-prim',
  'maze-kruskal',
])

/** The structure's own operation buttons (push, enqueue, insert, search)
 *  ARE the construction interaction. */
export const BUTTONS_ARE_HANDS_ON = new Set([
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'hash-table-chaining',
  'hash-table-probing',
  'max-heap-insert',
  'max-heap-delete',
  'min-heap-insert',
  'min-heap-delete',
  'trie-insert',
  'trie-search',
  'trie-delete',
  'dijkstra',
  'bellman-ford',
  'kruskal',
  'prim',
  'cycle-detection',
  'connected-components',
])

/** The same drag interaction is intended, but is not built yet. */
export const HANDS_ON_COMING_SOON = new Set([
  'array-insert',
  'array-delete',
  'counting-sort',
  'radix-sort',
])

/** A real gesture on the canvas, built and live. */
export const HANDS_ON_ACTIVE = new Set([
  'bubble-sort',
  'insertion-sort',
  'selection-sort',
  'merge-sort',
  'quick-sort',
  'shell-sort',
  'heap-sort',
  'grid-bfs',
  'grid-dfs',
  'grid-dijkstra',
  'grid-astar',
  'bst',
  'bst-search',
  'bst-delete',
  'avl-insert',
  'avl-delete',
  'rb-insert',
  'rb-delete',
  'tree-inorder',
  'tree-preorder',
  'tree-postorder',
  'tree-level-order',
  'bfs',
  'dfs',
  'topological-sort',
])

export function hasCodeMode(slug: string): boolean {
  return hasCodeChallenge(slug)
}

export const CODE_MODE_ACTIVE: ReadonlySet<string> = new Set(Object.keys(CODE_CHALLENGES))

export const NO_JUNCTIONS = new Set(['maze-generation', 'maze-prim', 'maze-kruskal'])

const RANDOM_GENERATORS = new Set(['maze-generation', 'maze-prim', 'maze-kruskal'])

const SUMMARY: Record<PipelineStageId, string> = {
  DEMO: 'Watch it run, and read what it does.',
  PRACTICE: 'Predict each decision; the tutor answers your mistakes.',
  HANDS_ON: 'Carry the steps out yourself on the canvas.',
  CODE: 'Write the core logic, graded on correctness and edge cases.',
  FEYNMAN: 'Explain it back in your own words.',
}

const LABEL: Record<PipelineStageId, string> = {
  DEMO: 'Demo',
  PRACTICE: 'Practice',
  HANDS_ON: 'Hands-On',
  CODE: 'Code',
  FEYNMAN: 'Feynman',
}

export interface PipelineInput {
  slug: string
  /** A Demo or Practice run has reached its final step in this session. */
  runCompletedHere: boolean
  /** A Practice run was completed on this topic, in any session. */
  practiceCompleted: boolean
  /** A Hands-On run reached its final step on this topic. */
  handsOnCompleted?: boolean
  /** Feynman is available right now (rubric exists, not Classic). */
  feynmanAvailable: boolean
  /** Feynman explanation passed on this topic. */
  feynmanCompleted?: boolean
  /** Why Feynman is not available, when it is not. */
  feynmanReason: string | null
  /** Classic is the study's control condition: a plain visualiser with no tutor stages at all. */
  classic: boolean
  /** The topic's code challenge or code ladder has been finished. */
  codeCompleted: boolean
}

export function pipelineFor(input: PipelineInput): PipelineStage[] {
  const { slug, classic } = input

  if (classic) {
    return [stage('DEMO', 'AVAILABLE', null)]
  }

  const practiceDone = input.practiceCompleted
  const demoDone = practiceDone || input.runCompletedHere || Boolean(input.handsOnCompleted)

  return [
    stage('DEMO', demoDone ? 'DONE' : 'AVAILABLE', null),
    practiceStage(slug, practiceDone),
    handsOnStage(slug, Boolean(input.handsOnCompleted)),
    codeStage(slug, input.codeCompleted),
    feynmanStage(input),
  ]
}

function stage(id: PipelineStageId, status: StageStatus, reason: string | null): PipelineStage {
  return { id, label: LABEL[id], summary: SUMMARY[id], status, reason }
}

function practiceStage(slug: string, practiceDone: boolean): PipelineStage {
  if (NO_JUNCTIONS.has(slug)) {
    return stage(
      'PRACTICE',
      'NOT_OFFERED',
      RANDOM_GENERATORS.has(slug)
        ? 'This builds a random maze, so there is no next step to predict. Watch it in Demo.'
        : 'This topic has no prediction junctions. Watch it in Demo.',
    )
  }
  return stage('PRACTICE', practiceDone ? 'DONE' : 'AVAILABLE', null)
}

function handsOnStage(slug: string, completed: boolean): PipelineStage {
  if (NO_HANDS_ON.has(slug)) {
    return stage(
      'HANDS_ON',
      'NOT_OFFERED',
      hasCodeMode(slug)
        ? 'This algorithm has no step to carry out by hand. Write it in Code instead.'
        : 'This algorithm has no step to carry out by hand. Watch how it works in Demo.',
    )
  }
  if (BUTTONS_ARE_HANDS_ON.has(slug)) {
    return stage(
      'HANDS_ON',
      'NOT_OFFERED',
      "This structure's own operations in the controls are the hands-on work.",
    )
  }
  if (HANDS_ON_COMING_SOON.has(slug)) {
    // Says what the learner can do, not what the app hasn't built: the
    // decisions a drag would test are asked as Practice questions.
    return stage('HANDS_ON', 'NOT_OFFERED', 'Hands-on is not part of this topic. Practice asks the same decisions as questions.')
  }
  if (!HANDS_ON_ACTIVE.has(slug)) {
    return stage('HANDS_ON', 'NOT_OFFERED', 'Not available for this algorithm.')
  }
  return stage('HANDS_ON', completed ? 'DONE' : 'AVAILABLE', null)
}

function codeStage(slug: string, completed: boolean): PipelineStage {
  if (!hasCodeMode(slug)) {
    return stage(
      'CODE',
      'NOT_OFFERED',
      NO_JUNCTIONS.has(slug)
        ? 'This builds a random maze, so there is no step to write code for.'
        : 'There is no code challenge for this topic.',
    )
  }
  return stage('CODE', completed ? 'DONE' : 'AVAILABLE', null)
}

function feynmanStage(input: PipelineInput): PipelineStage {
  if (input.feynmanAvailable) {
    return stage('FEYNMAN', input.feynmanCompleted ? 'DONE' : 'AVAILABLE', null)
  }
  return stage('FEYNMAN', 'NOT_OFFERED', input.feynmanReason ?? FEYNMAN_NO_RUBRIC_REASON)
}

export function stageOffer(
  stages: readonly PipelineStage[],
  id: PipelineStageId,
): { enabled: boolean; reason: string | null } {
  const found = stages.find((s) => s.id === id)
  if (!found) return { enabled: false, reason: null }
  return { enabled: found.status === 'AVAILABLE' || found.status === 'DONE', reason: found.reason }
}

export function pipelineProgress(stages: readonly PipelineStage[]): { done: number; offered: number } {
  const offered = stages.filter((s) => s.status !== 'NOT_OFFERED')
  return { done: offered.filter((s) => s.status === 'DONE').length, offered: offered.length }
}
