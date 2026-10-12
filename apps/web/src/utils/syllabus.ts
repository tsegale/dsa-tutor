import type { TopicDto } from '@dsa-tutor/types'
import { MODULES, type Module } from '@/config/curriculum'
import { canOpen, isPreview, lockReason, moduleStatus, topicNumber, topicState, type ModuleStatus, type TopicState } from './moduleStatus'

// The curriculum as the rail and the module pages show it: modules in
// order, each with its numbered topics and their states. Pure, so the panel
// renders data and the rules stay testable.

export interface SyllabusTopic {
  topic: TopicDto
  /** "3.4" */
  number: string
  state: TopicState
  /** False only under a hard lock (the API's, or hardLocks). */
  openable: boolean
  /** A locked module's first topic: open, and labelled as a preview. */
  preview: boolean
  /** Plain-language reason when locked, else null. */
  reason: string | null
}

export interface SyllabusModule {
  module: Module
  status: ModuleStatus
  topics: SyllabusTopic[]
}

/**
 * Modules with at least one visible topic, in module order. A study
 * participant sees only the modules holding their topics, keeping the real
 * module and topic numbers, and never an empty module or a 0/0 bar.
 */
export function buildSyllabus(topics: readonly TopicDto[]): SyllabusModule[] {
  return MODULES.map((module) => {
    const status = moduleStatus(module, topics)
    // In syllabus order, numbered by syllabus position: a participant who
    // sees one topic of a module still sees its real number (2.2, not 2.1).
    const own = module.topics.flatMap((name, index) => {
      const topic = topics.find((candidate) => candidate.name === name)
      return topic ? [{ topic, index }] : []
    })
    return {
      module,
      status,
      topics: own.map(({ topic, index }) => {
        const state = topicState(topic, status, module)
        return {
          topic,
          number: topicNumber(module, index),
          state,
          openable: canOpen(topic, status, module),
          preview: isPreview(topic, status, module),
          reason: state === 'locked' ? lockReason(topic, status) : null,
        }
      }),
    }
  }).filter((entry) => entry.topics.length > 0)
}

/** The module holding a topic, by topic name. */
export function moduleOfTopic(syllabus: readonly SyllabusModule[], topicName: string | null | undefined): SyllabusModule | null {
  if (!topicName) return null
  return syllabus.find((entry) => entry.topics.some((t) => t.topic.name === topicName)) ?? null
}

/**
 * The one module open on first load: the one holding the current topic (in
 * the workspace) or the next topic (Home's Continue target), else the first
 * module not yet complete, else the first.
 */
export function defaultExpandedModule(syllabus: readonly SyllabusModule[], focusTopicName: string | null | undefined): string | null {
  const focused = moduleOfTopic(syllabus, focusTopicName)
  if (focused) return focused.module.id
  return (syllabus.find((entry) => entry.status.state !== 'complete') ?? syllabus[0])?.module.id ?? null
}

// Expansion state persists per user. Storage can be blocked (private
// windows, cleared site data), so every access is guarded and falls back to
// the default rather than failing the panel.

export const expandedStorageKey = (userId: string | undefined) => `dsa-tutor-curriculum-expanded:${userId ?? 'anonymous'}`

export function readExpanded(storage: Pick<Storage, 'getItem'> | undefined, key: string): string[] | null {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : null
  } catch {
    // Unreadable or blocked: use the default.
    return null
  }
}

export function writeExpanded(storage: Pick<Storage, 'setItem'> | undefined, key: string, ids: readonly string[]): void {
  try {
    storage?.setItem(key, JSON.stringify(ids))
  } catch {
    // Blocked storage: expansion still works for this visit, it just is not
    // remembered. Nothing to recover.
  }
}
