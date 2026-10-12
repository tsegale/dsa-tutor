import { Link } from 'react-router-dom'
import type { TopicDto } from '@dsa-tutor/types'
import { getTrack, topicPath } from '@/data/tracks'
import { isTopicComplete, relativeDay, type ContinueTarget } from '@/utils/curriculum'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'

// Home's answer to "what do I do now": one card, one primary action.
// The session records no step position, so "where you left off" is the
// topic and when it was last opened, not an invented step number.
export function ContinueCard({
  target,
  sessionUnavailable = false,
}: {
  target: ContinueTarget<TopicDto>
  /** The last-session request failed: say so rather than silently showing
   * a start card to someone who may have a session to resume. */
  sessionUnavailable?: boolean
}) {
  if (target.kind === 'done') {
    return (
      <section id="home-continue" aria-labelledby="continue-heading" className="rounded-md border border-rule bg-surface p-panel shadow-e1">
        <p className="text-micro text-ink-2">All caught up</p>
        <h2 id="continue-heading" className="mt-1 text-h2 text-ink">
          Every topic you can open is complete
        </h2>
        <p className="mt-2 max-w-prose text-small text-ink-2">Review any topic, or see where you stand on the progress page.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/progress">See your progress</Link>
        </Button>
      </section>
    )
  }

  const { topic } = target
  const isContinue = target.kind === 'continue'
  const trackName = getTrack(topic.track).name

  return (
    <section
      id="home-continue"
      aria-labelledby="continue-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-surface p-panel shadow-e1 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="text-micro text-ink-2">{isContinue ? 'Continue where you left off' : 'Start here'}</p>
        <h2 id="continue-heading" className="mt-1 text-h2 text-ink">
          {topic.displayName}
        </h2>
        <p className="mt-1 text-small text-ink-2">
          {trackName}
          {isContinue ? ` · last opened ${relativeDay(target.startTime)}` : ` · about ${topic.estimatedMinutes} min`}
        </p>
        <p className="mt-3 max-w-prose text-small text-ink-2">{topic.description}</p>
        {sessionUnavailable && (
          <p className="mt-3 text-micro text-ink-2">Your last session could not be loaded, so this is the next topic in your curriculum instead.</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-5">
        <ProgressRing value={topic.masteryPercent} size={64} strokeWidth={5} ariaLabel={`${topic.displayName} mastery`} tone={isTopicComplete(topic) ? 'success' : 'brand'} />
        <Button asChild>
          <Link to={topicPath(topic.name)}>{isContinue ? 'Continue' : 'Start'}</Link>
        </Button>
      </div>
    </section>
  )
}
