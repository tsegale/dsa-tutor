import type { TopicDto } from '@dsa-tutor/types'
import { MODULES, type Module } from '@/config/curriculum'
import { moduleStatus, topicNumber, topicState, type ModuleStatus, type TopicState } from './moduleStatus'

// The curriculum as the rail and the module pages show it: modules in
// order, each with its numbered topics and their states. Pure, so the panel
// renders data and the rules stay testable.

export interface SyllabusTopic {
  topic: TopicDto
  /** "3.4" */
  number: string
  state: TopicState
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
      topics: own.map(({ topic, index }) => ({
        topic,
        number: topicNumber(module, index),
        state: topicState(topic),
      })),
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

// One answer to "what next" (Phase 3.1B). Home's Continue card, the AI
// recommendation, the module cards' "Next" and the rail's focus all read
// this, so they cannot disagree.

export interface LearningPlan {
  /** The latest unfinished session, when its topic is visible and opens: resume. */
  continue: { entry: SyllabusTopic; startTime: string } | null
  /** The first incomplete topic at or after the furthest topic reached. */
  recommended: SyllabusTopic | null
  /** The furthest topic reached (any mastery), or null with no progress. */
  furthest: SyllabusTopic | null
  /** The one topic the app points at: the open session, else the recommendation. */
  focus: SyllabusTopic | null
  /**
   * Each module's next topic, for module sections and pages. The module that
   * holds the focus topic names the focus topic, so Home's banner and its own
   * module never name different topics; other modules use nextInSequence.
   */
  nextByModule: Map<string, SyllabusTopic | null>
}

/**
 * The first incomplete topic at or after the furthest one reached, never
 * earlier: recommending 1.1 after work on 1.7 would point backwards. With no
 * progress at all the search starts from the beginning. Returns null when
 * nothing incomplete lies at or after that point.
 */
export function nextInSequence(sequence: readonly SyllabusTopic[]): SyllabusTopic | null {
  let furthest = -1
  sequence.forEach((entry, index) => {
    if (entry.topic.masteryPercent > 0) furthest = index
  })
  const ahead = sequence.slice(Math.max(furthest, 0))
  return ahead.find((entry) => entry.state !== 'complete') ?? null
}

export function planNext(
  syllabus: readonly SyllabusModule[],
  latest: { startTime: string; topic?: { name: string } | null } | null | undefined,
): LearningPlan {
  const sequence = syllabus.flatMap((module) => module.topics)
  // A session row whose topic did not come back is treated as no session
  // rather than dereferenced. This read `latest.topic.name` behind a check
  // that `latest` was merely truthy, so a session without its topic threw
  // inside the memo that every page of the shell depends on - and the
  // error boundary replaced the whole app with its error screen. Found by
  // loading the page, not by a test: every unit test passes a well-formed
  // session, because a test author knows the shape.
  const resumeName = latest?.topic?.name ?? null
  const resumable = resumeName ? sequence.find((entry) => entry.topic.name === resumeName) : undefined
  const furthest = [...sequence].reverse().find((entry) => entry.topic.masteryPercent > 0) ?? null
  const recommended = nextInSequence(sequence)
  const resume = resumable && latest?.startTime ? { entry: resumable, startTime: latest.startTime } : null
  const focus = resume?.entry ?? recommended
  return {
    continue: resume,
    recommended,
    furthest,
    focus,
    nextByModule: new Map(
      syllabus.map((module) => [
        module.module.id,
        focus && module.topics.includes(focus) ? focus : nextInSequence(module.topics),
      ])
    ),
  }
}
