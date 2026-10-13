import type { Module } from '@/config/curriculum'
import type { SyllabusTopic } from '@/utils/syllabus'
import { TopicCard } from './TopicCard'

/** Topic cards, 3 / 2 / 1 columns at lg / md / sm (Phase 5C), on Home and module pages. */
export function TopicGrid({
  topics,
  next,
  buildsOn,
  firstRevealed = null,
}: {
  topics: SyllabusTopic[]
  /** The module's next topic, from the shared learning plan. */
  next: SyllabusTopic | null
  /** The unmet prerequisite module, when the module is locked. */
  buildsOn: Module | null
  firstRevealed?: string | null
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((row) => (
        <TopicCard key={row.topic.id} entry={row} isNext={row.topic.id === next?.topic.id} buildsOn={buildsOn} revealFocus={row.topic.name === firstRevealed} />
      ))}
    </ul>
  )
}
