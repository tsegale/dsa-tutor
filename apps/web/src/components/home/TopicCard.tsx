import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { demoPath, topicPath } from '@/data/tracks'
import { isTopicComplete, practiceAction } from '@/utils/curriculum'
import { DIFFICULTY_LABEL } from '@/utils/difficulty'
import type { SyllabusTopic } from '@/utils/syllabus'
import { buttonVariants } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import { MasteryMark } from '@/components/mastery/MasteryMark'
import { CriteriaSegments } from '@/components/mastery/CriteriaSegments'

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-state-sorted" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * One topic on Home's syllabus and on a module page (Phase 5C). The whole
 * card is the practice link: the title's link is stretched over it, so the
 * card is one tab stop and one click target, and it lifts to --e2 on hover.
 * "Watch demo" (the passive mode) sits above that link as the one secondary
 * action. The drawn button is the link's visible label, not a second control.
 *
 * States differ at a glance: a check in --state-sorted when complete and the
 * brand dot while in progress. Mastery (Phase 7D) takes the marker's place
 * once Proficient (a half ring) or Mastered (a filled check), and four
 * segments under the ring show which criteria are met. Mastery is display
 * only: it never changes what opens. Every card opens - there is no locked
 * state and no padlock, and no card explains why it cannot be entered.
 */
export function TopicCard({
  entry,
  isNext,
  revealFocus = false,
}: {
  entry: SyllabusTopic
  /** The module's next topic: the section's one filled primary action. */
  isNext: boolean
  /** The first card "Show all" revealed: focus moves here. */
  revealFocus?: boolean
}) {
  const { topic, number, state } = entry
  const action = practiceAction(entry)
  const label = action ?? 'Open'
  const { status } = topic.mastery
  const masteryMarked = status === 'MASTERED' || status === 'PROFICIENT'

  return (
    <li
      className={cn(
        // content-visibility lets the browser skip layout and paint for cards
        // off screen (Phase 5E: 66 cards with every section open); they stay
        // in the DOM and accessibility tree, so Tab and find still reach them.
        'relative flex flex-col rounded-md border border-rule bg-surface p-card transition-shadow duration-quick [contain-intrinsic-size:auto_18rem] [content-visibility:auto]',
        'hover:shadow-e2'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5">
          {masteryMarked && <MasteryMark status={status} />}
          {!masteryMarked && state === 'complete' && <CheckIcon />}
          {!masteryMarked && state === 'in-progress' && <span aria-hidden="true" className="size-2 rounded-full bg-brand" />}
          <span className="text-mono-sm text-ink-2">{number}</span>
        </span>
        <span className="flex w-12 flex-col items-stretch gap-1.5">
          <ProgressRing
            value={topic.masteryPercent}
            size={48}
            strokeWidth={4}
            tone={isTopicComplete(topic) ? 'success' : 'brand'}
            ariaLabel={`${topic.displayName} mastery`}
          />
          {status !== 'NOT_STARTED' && <CriteriaSegments mastery={topic.mastery} />}
        </span>
      </div>

      <h3 className="mt-2 text-h3 text-ink">
        <Link
          to={topicPath(topic.name)}
          data-card-link
          data-reveal-focus={revealFocus ? topic.name : undefined}
          aria-label={`${label}: ${number} ${topic.displayName}`}
          // Stretched over the card, so its focus ring outlines the card.
          className="outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-brand"
        >
          {topic.displayName}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-small text-ink-2">{topic.description}</p>
      <p className="mt-3 text-micro text-ink-2">
        {DIFFICULTY_LABEL[topic.difficulty]} · <span className="text-mono-sm">{topic.estimatedMinutes} min</span>
      </p>

      <div className="mt-auto flex flex-col items-stretch gap-2 pt-4">
        {action && (
          <span aria-hidden="true" className={cn(buttonVariants({ variant: isNext ? 'primary' : 'secondary', size: 'md' }), 'pointer-events-none w-full')}>
            {action}
          </span>
        )}
        <Link
          to={demoPath(topic.name)}
          aria-label={`Watch demo: ${number} ${topic.displayName}`}
          className="relative z-10 self-center rounded-sm px-1 text-small text-ink-2 underline-offset-2 hover:text-ink hover:underline"
        >
          Watch demo
        </Link>
      </div>
    </li>
  )
}
