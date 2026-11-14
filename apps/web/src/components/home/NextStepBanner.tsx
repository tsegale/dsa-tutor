import { Link } from 'react-router-dom'
import { placeOfTopic } from '@/config/curriculum'
import { topicPath } from '@/data/tracks'
import { isTopicComplete } from '@/utils/curriculum'
import type { NextStep } from '@/utils/nextStep'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import { TopicArtwork, getTopicTheme } from './TopicArtwork'

function CompassIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <polygon points="6.5,6.5 10.8,5.2 9.5,9.5 5.2,10.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TrophyCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-state-sorted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="var(--tone-emerald-bg)" />
      <path d="m6.5 10.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
      <section
        id="home-continue"
        aria-labelledby="next-step-heading"
        className="rounded-md border border-l-4 border-rule border-l-state-sorted bg-surface p-panel shadow-e2"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface-sunk px-2.5 py-0.5 text-micro font-semibold text-state-sorted">
          <TrophyCheckIcon />
          <span>All caught up</span>
        </div>
        <h2 id="next-step-heading" className="mt-2 text-h1 text-ink">
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
  const theme = getTopicTheme(topic.name)

  return (
    <section
      id="home-continue"
      aria-labelledby="next-step-heading"
      className="overflow-hidden rounded-md border border-l-4 border-rule bg-surface p-panel shadow-e2"
      style={{ borderLeftColor: theme.accent }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-semibold"
              style={{
                backgroundColor: theme.bg,
                color: theme.fg,
                borderColor: theme.border,
              }}
            >
              <CompassIcon />
              {step.eyebrow}
            </span>
            <span className="rounded-sm border border-rule bg-surface-sunk px-2 py-0.5 text-mono-sm font-semibold text-ink-2">
              {number}
            </span>
            {place && (
              <span className="text-small font-medium text-ink-2">
                <span className="mr-1.5 text-mono-sm">Module {place.module.number}</span>· {place.module.title}
              </span>
            )}
            {step.kind === 'resume' && step.position && (
              <span className="rounded-full border border-rule bg-surface-sunk px-2.5 py-0.5 text-mono-sm text-ink-2">
                step {step.position.step} of {step.position.total}
              </span>
            )}
          </div>

          <h2 id="next-step-heading" className="mt-2.5 text-h1 text-ink">
            {topic.displayName}
          </h2>
          <p className="mt-2 max-w-prose text-body text-ink">{step.reasoning}</p>
          {sessionUnavailable && (
            <p className="mt-2 text-micro text-ink-2">Your last session could not be loaded, so this is the next topic in your curriculum instead.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:flex-nowrap">
          <TopicArtwork slug={topic.name} className="hidden h-20 w-44 shrink-0 sm:flex" />
          <ProgressRing
            value={topic.masteryPercent}
            size={76}
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
