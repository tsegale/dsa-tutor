import type { SyllabusTopic } from '@/utils/syllabus'
import { TopicCard } from './TopicCard'

/** Topic cards, 3 / 2 / 1 columns at lg / md / sm (Phase 5C), on Home and module pages. */
export function TopicGrid({
  topics,
  next,
  firstRevealed = null,
}: {
  topics: SyllabusTopic[]
  /** The module's next topic, from the shared learning plan. */
  next: SyllabusTopic | null
  firstRevealed?: string | null
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((row) => (
        <TopicCard key={row.topic.id} entry={row} isNext={row.topic.id === next?.topic.id} revealFocus={row.topic.name === firstRevealed} />
      ))}
    </ul>
  )
}
