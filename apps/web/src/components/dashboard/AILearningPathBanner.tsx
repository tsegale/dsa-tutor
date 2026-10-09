import { Link } from 'react-router-dom'
import type { TopicDto } from '@dsa-tutor/types'
import { topicPath } from '@/data/tracks'
import { orderTopics } from '@/utils/curriculum'
import { Button } from '@/components/ui/button'

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 13.8 9.2 21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
    </svg>
  )
}

/**
 * The recommendation shown under Home's Continue card. Rendered only when
 * there is a real one: some progress to build on and an unstarted topic to
 * go to. With no progress the Continue card already says where to start, so
 * a "Welcome, start with X" banner would only repeat it. Recommendations
 * follow curriculum order and never hardcode a topic (remediation doc 9.1).
 * Cyan: the AI accent, on AI surfaces only.
 */
export default function AILearningPathBanner({ topics }: { topics: TopicDto[] }) {
  const ordered = orderTopics(topics)
  const strongest = [...ordered].filter((t) => t.masteryPercent > 0).sort((a, b) => b.masteryPercent - a.masteryPercent)[0]
  const next = ordered.find((t) => !t.isLocked && t.masteryPercent === 0)
  if (!strongest || !next) return null

  return (
    <section aria-label="AI learning path recommendation" className="flex flex-col gap-3 rounded-md border border-ai/30 bg-ai-light p-card sm:flex-row sm:items-center">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ai text-ai-contrast">
        <SparklesIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-micro text-ai-foreground">AI learning path recommendation</p>
        <p className="mt-0.5 text-small text-ink">
          You have made progress on {strongest.displayName}. Recommended next: {next.displayName}.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 bg-ai text-ai-contrast hover:bg-ai/90">
        <Link to={topicPath(next.name)}>Start {next.displayName}</Link>
      </Button>
    </section>
  )
}
