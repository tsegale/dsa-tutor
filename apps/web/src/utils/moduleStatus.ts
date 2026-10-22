import type { AlgorithmTrack } from '@dsa-tutor/types'
import { TOPIC_COMPLETE, type Module } from '@/config/curriculum'

// Module and topic status for the syllabus, as pure functions over the
// topics the API returned (each carries the user's masteryPercent). No React.
//
// Nothing here gates anything. Every topic in the curriculum opens, always,
// and no state here means "you may not". Modules and their order are
// teaching structure - a suggested path - not a set of gates: the learner is
// pointed at a next topic (see planNext) and free to ignore it.
//
// There used to be a prerequisite lock: a module was 'locked' until
// unlockCount topics of its prerequisites were complete, which drew a
// padlock and the line "Complete 2 topics in Module 3 to unlock". It had
// already been turned off (hardLocks = false) so every topic opened anyway -
// the padlocks and that sentence were telling the learner something untrue.

export interface TopicMastery {
  name: string
  track: AlgorithmTrack
  masteryPercent: number
}

export type ModuleState = 'available' | 'in-progress' | 'complete'
export type TopicState = ModuleState

export interface ModuleStatus {
  state: ModuleState
  /** Mean mastery across this module's visible topics, 0-100, rounded. */
  mean: number
  /** Topics at or above TOPIC_COMPLETE. */
  complete: number
  total: number
}

const mean = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0)

export const isComplete = (topic: Pick<TopicMastery, 'masteryPercent'>) => topic.masteryPercent >= TOPIC_COMPLETE

// Membership is the module's own topic list (config/curriculum.ts), not the
// track: a stale row on the module's track is not part of the module.
const topicsOf = <T extends TopicMastery>(topics: readonly T[], module: Module) => topics.filter((topic) => module.topics.includes(topic.name))

export function moduleStatus(module: Module, topics: readonly TopicMastery[]): ModuleStatus {
  const own = topicsOf(topics, module)
  const complete = own.filter(isComplete).length
  const started = own.some((topic) => topic.masteryPercent > 0)

  const state: ModuleState =
    own.length > 0 && complete === own.length ? 'complete' : started ? 'in-progress' : 'available'

  return { state, mean: mean(own.map((topic) => topic.masteryPercent)), complete, total: own.length }
}

/** A topic's marker. Progress only - there is no state that withholds it. */
export function topicState(topic: TopicMastery): TopicState {
  if (isComplete(topic)) return 'complete'
  return topic.masteryPercent > 0 ? 'in-progress' : 'available'
}

/** How a topic's status reads aloud (the markers themselves are decorative). */
export const TOPIC_STATE_LABEL: Record<TopicState, string> = {
  complete: 'complete',
  'in-progress': 'in progress',
  available: 'not started',
}

/** Syllabus numbering: module.topic, e.g. "5.18". */
export const topicNumber = (module: Pick<Module, 'number'>, indexInModule: number) => `${module.number}.${indexInModule + 1}`
