import { Link } from 'react-router-dom'
import { placeOfTopic } from '@/config/curriculum'
import { topicPath } from '@/data/tracks'
import { isTopicComplete } from '@/utils/curriculum'
import type { NextStep } from '@/utils/nextStep'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'

/**
 * Home's one "what next" block (Phase 5A), replacing the Continue card and
 * the AI recommendation banner, which answered the same question and could
 * disagree. Full width and the heaviest element on the page: one topic, one
 * primary action, one line of reasoning. Its content comes from nextStep(),
 * which only words the shared learning plan.
 */
export function NextStepBanner({ step, sessionUnavailable = false }: { step: NextStep; sessionUnavailable?: boolean }) {
  if (step.kind === 'done') {
    return (
      <section id="home-continue" aria-labelledby="next-step-heading" className="rounded-md border border-rule bg-surface p-panel shadow-e2">
        <p className="text-micro text-ink-2">All caught up</p>
        <h2 id="next-step-heading" className="mt-1 text-h1 text-ink">
          Every topic you can open is complete
        </h2>
        <p className="mt-3 max-w-prose text-body text-ink-2">Review any topic below, or see where you stand on the progress page.</p>
        <Button asChild variant="secondary" size="lg" className="mt-5">
          <Link to="/progress">See your progress</Link>
        </Button>
      </section>
    )
  }

  const { topic, number } = step.entry
  const place = placeOfTopic(topic.name)

  return (
    <section id="home-continue" aria-labelledby="next-step-heading" className="rounded-md border border-rule bg-surface p-panel shadow-e2">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-micro text-ink-2">{step.eyebrow}</p>
          <h2 id="next-step-heading" className="mt-1 text-h1 text-ink">
            {topic.displayName}
          </h2>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-small text-ink-2">
            <span className="text-mono-sm">{number}</span>
            {place && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="mr-1.5 text-mono-sm">Module {place.module.number}</span>
                  {place.module.title}
                </span>
              </>
            )}
            {step.kind === 'resume' && step.position && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-mono-sm">
                  step {step.position.step} of {step.position.total}
                </span>
              </>
            )}
          </p>
          <p className="mt-3 max-w-prose text-body text-ink">{step.reasoning}</p>
          {sessionUnavailable && (
            <p className="mt-2 text-micro text-ink-2">Your last session could not be loaded, so this is the next topic in your curriculum instead.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <ProgressRing
            value={topic.masteryPercent}
            size={80}
            strokeWidth={6}
            ariaLabel={`${topic.displayName} mastery`}
            tone={isTopicComplete(topic) ? 'success' : 'brand'}
          />
          <Button asChild size="lg">
            <Link to={topicPath(topic.name)}>{step.action}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
