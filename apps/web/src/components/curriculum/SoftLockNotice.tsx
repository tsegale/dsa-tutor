import { useState } from 'react'
import { useTopics } from '@/hooks/useTopics'
import { moduleLabel } from '@/config/curriculum'
import { buildSyllabus } from '@/utils/syllabus'

// Locks are soft: a topic in a locked module still opens, and the workspace
// says, once, what it builds on. Dismissible for this visit (the workspace
// remounts per topic, so each locked topic says it again).
export function SoftLockNotice({ topicName }: { topicName: string | undefined }) {
  const { data: topics } = useTopics()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !topicName || !topics) return null

  const entry = buildSyllabus(topics).find((module) => module.topics.some((t) => t.topic.name === topicName))
  const topic = entry?.topics.find((t) => t.topic.name === topicName)
  const unmet = entry?.status.unmet
  if (!entry || !topic || topic.state !== 'locked' || !topic.openable || !unmet) return null

  return (
    <div role="status" className="flex shrink-0 items-center justify-between gap-4 border-b border-rule bg-surface-sunk px-4 py-2 text-small text-ink">
      <p>This builds on {moduleLabel(unmet.module)}.</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notice"
        className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
