import type { AlgorithmTrack } from '@dsa-tutor/types'
import { TOPIC_COMPLETE, getModule, hardLocks as HARD_LOCKS, moduleLabel, type Module } from '@/config/curriculum'

// Module and topic status for the syllabus, as pure functions over the
// topics the API returned (each carries the user's masteryPercent). No React.
//
// The rules (Phase 3.1A):
// 1. A prerequisite is met when `unlockCount` of its topics are complete
//    (at or above TOPIC_COMPLETE): a count of specific work, not a mean.
// 2. A module with any started topic is never locked: it is in progress,
//    whatever its prerequisites say.
// 3. A module's first topic is always open, as a preview while the module
//    is locked, so every module can be looked into.

export interface TopicMastery {
  name: string
  track: AlgorithmTrack
  masteryPercent: number
  /** The API's own lock: always a hard lock, whatever the module says. */
  isLocked: boolean
}

export type ModuleState = 'locked' | 'available' | 'in-progress' | 'complete'
export type TopicState = ModuleState

export interface UnmetPrerequisite {
  module: Module
  /** Topics that must be complete there. */
  required: number
  /** Topics complete there now. */
  done: number
}

export interface ModuleStatus {
  state: ModuleState
  /** Mean mastery across this module's visible topics, 0-100, rounded. */
  mean: number
  /** Topics at or above TOPIC_COMPLETE. */
  complete: number
  total: number
  /** The first prerequisite not yet met, or null. Reported even when rule 2
   * keeps a started module open, but the module is then not locked. */
  unmet: UnmetPrerequisite | null
}

const mean = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0)

export const isComplete = (topic: Pick<TopicMastery, 'masteryPercent'>) => topic.masteryPercent >= TOPIC_COMPLETE

// Membership is the module's own topic list (config/curriculum.ts), not the
// track: a stale row on the module's track is not part of the module.
const topicsOf = <T extends TopicMastery>(topics: readonly T[], module: Module) => topics.filter((topic) => module.topics.includes(topic.name))

/**
 * A prerequisite with no topics visible to this user (a study participant
 * sees only their three topics) cannot be measured, so it counts as met.
 * When fewer topics are visible than unlockCount, all visible ones must be
 * complete.
 */
function unmetPrerequisite(module: Module, topics: readonly TopicMastery[]): UnmetPrerequisite | null {
  for (const id of module.prerequisites) {
    const prerequisite = getModule(id)
    const visible = topicsOf(topics, prerequisite)
    if (visible.length === 0) continue
    const required = Math.min(prerequisite.unlockCount, visible.length)
    const done = visible.filter(isComplete).length
    if (done < required) return { module: prerequisite, required, done }
  }
  return null
}

export function moduleStatus(module: Module, topics: readonly TopicMastery[]): ModuleStatus {
  const own = topicsOf(topics, module)
  const complete = own.filter(isComplete).length
  const started = own.some((topic) => topic.masteryPercent > 0)
  const unmet = unmetPrerequisite(module, topics)

  const state: ModuleState =
    own.length > 0 && complete === own.length
      ? 'complete'
      : started
        ? 'in-progress'
        : unmet
          ? 'locked'
          : 'available'

  return { state, mean: mean(own.map((topic) => topic.masteryPercent)), complete, total: own.length, unmet }
}

/** Whether this is the module's first topic: always open (rule 3). */
export const isFirstTopic = (module: Module, topicName: string) => module.topics[0] === topicName

/**
 * A topic's marker. Complete once at TOPIC_COMPLETE; an API lock is always
 * locked; in a locked module only the first topic is open (a preview).
 */
export function topicState(topic: TopicMastery, status: ModuleStatus, module: Module): TopicState {
  if (topic.isLocked) return 'locked'
  if (isComplete(topic)) return 'complete'
  if (status.state === 'locked' && !isFirstTopic(module, topic.name)) return 'locked'
  return topic.masteryPercent > 0 ? 'in-progress' : 'available'
}

/** A locked module's open first topic, labelled as a preview in the rail. */
export const isPreview = (topic: TopicMastery, status: ModuleStatus, module: Module) =>
  status.state === 'locked' && isFirstTopic(module, topic.name) && !topic.isLocked

/**
 * Whether the topic opens. The API's lock never does. Soft locks always do;
 * under hardLocks a locked module's topics do not, except its first (rule 3).
 */
export function canOpen(topic: TopicMastery, status: ModuleStatus, module: Module, hardLocks: boolean = HARD_LOCKS): boolean {
  if (topic.isLocked) return false
  if (!hardLocks || status.state !== 'locked') return true
  return isFirstTopic(module, topic.name)
}

/** One line: "Complete 3 topics in Module 1 to unlock (1 done)". */
export function unmetLabel(unmet: UnmetPrerequisite): string {
  const topics = unmet.required === 1 ? 'topic' : 'topics'
  return `Complete ${unmet.required} ${topics} in Module ${unmet.module.number} to unlock (${unmet.done} done)`
}

/** Plain-language reason a topic is locked, or null when it is not. */
export function lockReason(topic: Pick<TopicMastery, 'isLocked'>, status: Pick<ModuleStatus, 'unmet' | 'state'>): string | null {
  if (topic.isLocked) return 'Not open yet: complete the earlier topics in this module first.'
  if (status.state === 'locked' && status.unmet) return `${unmetLabel(status.unmet)}.`
  return null
}

/** The module a soft-locked topic builds on, for the workspace notice. */
export const buildsOnLabel = (unmet: UnmetPrerequisite) => `This builds on ${moduleLabel(unmet.module)}.`

/** How a topic's status reads aloud (the markers themselves are decorative). */
export const TOPIC_STATE_LABEL: Record<TopicState, string> = {
  complete: 'complete',
  'in-progress': 'in progress',
  available: 'not started',
  locked: 'locked',
}

/** Syllabus numbering: module.topic, e.g. "5.18". */
export const topicNumber = (module: Pick<Module, 'number'>, indexInModule: number) => `${module.number}.${indexInModule + 1}`
