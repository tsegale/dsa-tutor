import { Link } from 'react-router-dom'
import { topicPath } from '@/data/tracks'
import { aiRecommendation, type LearningPlan } from '@/utils/syllabus'
import { Button } from '@/components/ui/button'

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 13.8 9.2 21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
    </svg>
  )
}

/**
 * The recommendation under Home's Continue card, read from the one learning
 * plan (utils/syllabus planNext) so it cannot disagree with anything else:
 * - it needs progress to speak of, and a recommendation;
 * - when a Continue card is resuming a session, it renders only if it names
 *   the same topic, otherwise it would contradict the card;
 * - the recommendation itself never points before the furthest topic reached.
 * Cyan: the AI accent, on AI surfaces only.
 */
export default function AILearningPathBanner({ plan }: { plan: LearningPlan }) {
  const recommended = aiRecommendation(plan)
  const furthest = plan.furthest
  if (!recommended || !furthest) return null

  const progressLine =
    furthest.topic.name === recommended.topic.name
      ? `You have started ${recommended.number} ${recommended.topic.displayName}. Recommended next: finish it.`
      : `You have reached ${furthest.number} ${furthest.topic.displayName}. Recommended next: ${recommended.number} ${recommended.topic.displayName}.`

  return (
    <section aria-label="AI learning path recommendation" className="flex flex-col gap-3 rounded-md border border-ai/30 bg-ai-light p-card sm:flex-row sm:items-center">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ai text-ai-contrast">
        <SparklesIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-micro text-ai-foreground">AI learning path recommendation</p>
        <p className="mt-0.5 text-small text-ink">{progressLine}</p>
      </div>
      <Button asChild size="sm" className="shrink-0 bg-ai text-ai-contrast hover:bg-ai/90">
        <Link to={topicPath(recommended.topic.name)}>Open {recommended.topic.displayName}</Link>
      </Button>
    </section>
  )
}
