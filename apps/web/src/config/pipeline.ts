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

export type PipelineStageId = 'DEMO' | 'PRACTICE' | 'HANDS_ON' | 'CODE' | 'FEYNMAN'

export type StageStatus =
  /** Finished. */
  | 'DONE'
  /** Open now. */
  | 'AVAILABLE'
  /** Real on this topic, but something has to happen first. */
  | 'LOCKED'
  /** Not offered on this topic at all, and never will be. */
  | 'NOT_OFFERED'

export interface PipelineStage {
  id: PipelineStageId
  label: string
  /** One line: what the student does in this stage. */
  summary: string
  status: StageStatus
  /** Why it is locked or not offered. Null when it is open. */
  reason: string | null
}

// ---------------------------------------------------------------- hands-on
//
// Four situations, not two, which is why this is four sets rather than one
// flag. Moved here verbatim from ModeToggle, which now imports them.

/** No physical construction gesture makes sense: pointer movement or
 *  recursion, not rearranging elements. Dragging a pointer is not the same
 *  interaction as dragging a bar to swap it, which is why the two-pointer
 *  and sliding-window topics sit here and not with the sorts. */
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
  // Matrix view, no spatial manipulation to hand on.
  'floyd-warshall',
  // Generation is automatic carving: nothing to drag, unlike the
  // pathfinding grids.
  'maze-generation',
  'maze-prim',
  'maze-kruskal',
])

/** The structure's own operation buttons (push, enqueue, insert, search)
 *  ARE the construction interaction. Entering a separate Hands-on mode
 *  would behave exactly like Practice, so the mode stays shut and the
 *  tracker points at the controls instead. */
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
  'bst',
  'bst-search',
  'bst-delete',
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
  // Node/edge graphs: dragging nodes and choosing presets, start and
  // target in the graph controls is the hands-on interaction. There is no
  // separate per-step gesture.
  'bfs',
  'dfs',
  'dijkstra',
  'bellman-ford',
  'kruskal',
  'prim',
  'cycle-detection',
  'connected-components',
  'topological-sort',
])

/** The same drag interaction is intended, but is not built yet. */
export const HANDS_ON_COMING_SOON = new Set([
  'array-insert',
  'array-delete',
  'counting-sort',
  'radix-sort',
  'tree-inorder',
  'tree-preorder',
  'tree-postorder',
  'tree-level-order',
])

/** A real drag interaction on the canvas, built and live. */
export const HANDS_ON_ACTIVE = new Set([
  'bubble-sort',
  'insertion-sort',
  'selection-sort',
  'merge-sort',
  'quick-sort',
  'shell-sort',
  'heap-sort',
  // Wall drawing and start/end dragging directly on the grid, genuinely
  // implemented rather than a placeholder.
  'grid-bfs',
  'grid-dfs',
  'grid-dijkstra',
  'grid-astar',
])

// -------------------------------------------------------------------- code
//
// Code Mode rewrites a junction's prediction into a line of code to write.
// Only one engine builds those junctions today (engine/bubbleSort.ts reads
// codeEditorMode); on every other topic the toggle changes nothing. Listing
// the real coverage here is what lets the toggle disable itself with a
// reason instead of being a control that silently does nothing.
export const CODE_MODE_ACTIVE = new Set(['bubble-sort'])

export function hasCodeMode(slug: string): boolean {
  return CODE_MODE_ACTIVE.has(slug)
}

// ------------------------------------------------------------------ stages

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
  HANDS_ON: 'Hands-on',
  CODE: 'Code',
  FEYNMAN: 'Feynman',
}

export interface PipelineInput {
  slug: string
  /** A Demo or Practice run has reached its final step in this session. */
  runCompletedHere: boolean
  /** A Practice run was completed on this topic, in any session. */
  practiceCompleted: boolean
  /** Feynman is available right now (rubric exists, run completed, not
   *  Classic). Computed by useFeynmanAccess, which owns those rules. */
  feynmanAvailable: boolean
  /** Why Feynman is not available, when it is not. */
  feynmanReason: string | null
  /** Classic is the study's control condition: a plain visualiser with no
   *  tutor stages at all. */
  classic: boolean
}

/**
 * The five stages for one topic, in order, each with a status and a reason.
 *
 * Feynman is deliberately NOT placed behind Hands-on and Code. It is one of
 * the four mastery criteria, and in a timed session almost nobody reaches
 * the end of a code challenge, so gating it there would quietly put mastery
 * out of reach. It opens when Practice is done, which is the point at which
 * a student has something to explain.
 */
export function pipelineFor(input: PipelineInput): PipelineStage[] {
  const { slug, classic } = input

  if (classic) {
    // One stage, and it is honest about being the whole of it: Classic has
    // no tutor features, so showing four locked stages would advertise
    // things this condition will never offer.
    return [stage('DEMO', 'AVAILABLE', null)]
  }

  const practiceDone = input.practiceCompleted
  // Demo counts as done once anything downstream has been: a student who
  // has practised the topic has plainly watched it.
  const demoDone = practiceDone || input.runCompletedHere

  return [
    stage('DEMO', demoDone ? 'DONE' : 'AVAILABLE', null),
    stage('PRACTICE', practiceDone ? 'DONE' : 'AVAILABLE', null),
    handsOnStage(slug, practiceDone),
    codeStage(slug, practiceDone),
    feynmanStage(input),
  ]
}

function stage(id: PipelineStageId, status: StageStatus, reason: string | null): PipelineStage {
  return { id, label: LABEL[id], summary: SUMMARY[id], status, reason }
}

function handsOnStage(slug: string, practiceDone: boolean): PipelineStage {
  if (NO_HANDS_ON.has(slug)) {
    return stage('HANDS_ON', 'NOT_OFFERED', 'This algorithm has no step to carry out by hand. Write it in Code instead.')
  }
  if (BUTTONS_ARE_HANDS_ON.has(slug)) {
    return stage(
      'HANDS_ON',
      'NOT_OFFERED',
      "This structure's own operations in the controls are the hands-on work.",
    )
  }
  if (HANDS_ON_COMING_SOON.has(slug)) {
    return stage('HANDS_ON', 'NOT_OFFERED', 'The drag interaction for this topic is not built yet.')
  }
  if (!HANDS_ON_ACTIVE.has(slug)) {
    return stage('HANDS_ON', 'NOT_OFFERED', 'Not available for this algorithm.')
  }
  return practiceDone
    ? stage('HANDS_ON', 'AVAILABLE', null)
    : stage('HANDS_ON', 'LOCKED', 'Finish a Practice run first.')
}

function codeStage(slug: string, practiceDone: boolean): PipelineStage {
  if (!hasCodeMode(slug)) {
    return stage('CODE', 'NOT_OFFERED', 'No code challenge written for this topic yet.')
  }
  return practiceDone
    ? stage('CODE', 'AVAILABLE', null)
    : stage('CODE', 'LOCKED', 'Finish a Practice run first.')
}

function feynmanStage(input: PipelineInput): PipelineStage {
  if (input.feynmanAvailable) return stage('FEYNMAN', 'AVAILABLE', null)
  // No rubric is permanent for this topic; anything else is a lock that
  // will lift once the student does the thing the reason names.
  const reason = input.feynmanReason
  const permanent = reason !== null && /not (?:available|written)/i.test(reason)
  return stage('FEYNMAN', permanent ? 'NOT_OFFERED' : 'LOCKED', reason ?? 'Finish a Practice run first.')
}

/** How far through the offered stages this topic is, for the heading. */
export function pipelineProgress(stages: readonly PipelineStage[]): { done: number; offered: number } {
  const offered = stages.filter((s) => s.status !== 'NOT_OFFERED')
  return { done: offered.filter((s) => s.status === 'DONE').length, offered: offered.length }
}
