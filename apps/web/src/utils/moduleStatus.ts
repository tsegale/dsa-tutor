import type { AlgorithmTrack } from '@dsa-tutor/types'
import { getModule, hardLocks as HARD_LOCKS, moduleLabel, type Module } from '@/config/curriculum'

// Module and topic status for the syllabus, as pure functions over the
// topics the API returned (each carries the user's masteryPercent). No React.

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
  /** That prerequisite's mean mastery now, 0-100, rounded. */
  mean: number
  threshold: number
}

export interface ModuleStatus {
  state: ModuleState
  /** Mean mastery across this module's visible topics, 0-100, rounded. */
  mean: number
  /** Topics at or above the module's threshold. */
  complete: number
  total: number
  /** The first prerequisite not yet met, or null. */
  unmet: UnmetPrerequisite | null
}

const mean = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0)

const topicsOf = <T extends TopicMastery>(topics: readonly T[], module: Module) => topics.filter((topic) => topic.track === module.track)

/**
 * A module is locked while any prerequisite's mean mastery is below the
 * threshold; complete when every one of its topics is at or above it;
 * in progress once any of its topics has mastery; otherwise available.
 *
 * A prerequisite with no topics visible to this user (a study participant
 * sees only their three topics) cannot be measured, so it counts as met:
 * otherwise their topics would sit behind a module they cannot see.
 */
export function moduleStatus(module: Module, topics: readonly TopicMastery[]): ModuleStatus {
  const own = topicsOf(topics, module)
  const complete = own.filter((topic) => topic.masteryPercent >= module.threshold).length

  let unmet: UnmetPrerequisite | null = null
  for (const id of module.prerequisites) {
    const prerequisite = getModule(id)
    const prerequisiteTopics = topicsOf(topics, prerequisite)
    if (prerequisiteTopics.length === 0) continue
    const prerequisiteMean = mean(prerequisiteTopics.map((topic) => topic.masteryPercent))
    if (prerequisiteMean < module.threshold) {
      unmet = { module: prerequisite, mean: prerequisiteMean, threshold: module.threshold }
      break
    }
  }

  const state: ModuleState = unmet
    ? 'locked'
    : own.length > 0 && complete === own.length
      ? 'complete'
      : own.some((topic) => topic.masteryPercent > 0)
        ? 'in-progress'
        : 'available'

  return { state, mean: mean(own.map((topic) => topic.masteryPercent)), complete, total: own.length, unmet }
}

/**
 * A topic's marker. Reaching the threshold shows as complete even inside a
 * locked module (soft locks let it be opened, and the work counts); short
 * of that, a locked module or an API lock shows as locked.
 */
export function topicState(topic: TopicMastery, status: ModuleStatus, threshold: number): TopicState {
  if (topic.masteryPercent >= threshold && !topic.isLocked) return 'complete'
  if (topic.isLocked || status.state === 'locked') return 'locked'
  return topic.masteryPercent > 0 ? 'in-progress' : 'available'
}

/** Whether the topic opens. Soft locks open; the API's lock never does. */
export function canOpen(topic: Pick<TopicMastery, 'isLocked'>, status: Pick<ModuleStatus, 'state'>, hardLocks: boolean = HARD_LOCKS): boolean {
  if (topic.isLocked) return false
  return !(hardLocks && status.state === 'locked')
}

/** Plain-language reason a topic is locked, or null when it is not. */
export function lockReason(topic: Pick<TopicMastery, 'isLocked'>, status: Pick<ModuleStatus, 'unmet'>): string | null {
  if (topic.isLocked) return 'Not open yet: complete the earlier topics in this module first.'
  if (status.unmet) return `Builds on ${moduleLabel(status.unmet.module)}. Reach ${status.unmet.threshold}% there to unlock.`
  return null
}

/** A locked module's prerequisite, in plain language: "Requires Module 1 at 60%". */
export function unmetLabel(unmet: UnmetPrerequisite): string {
  return `Requires Module ${unmet.module.number} at ${unmet.threshold}% (now ${unmet.mean}%)`
}

/** How a topic's status reads aloud (the markers themselves are decorative). */
export const TOPIC_STATE_LABEL: Record<TopicState, string> = {
  complete: 'complete',
  'in-progress': 'in progress',
  available: 'not started',
  locked: 'locked',
}

/** Syllabus numbering: module.topic, e.g. "5.18". */
export const topicNumber = (module: Pick<Module, 'number'>, indexInModule: number) => `${module.number}.${indexInModule + 1}`
