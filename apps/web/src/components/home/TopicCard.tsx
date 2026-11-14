import { Link } from 'react-router-dom'
import { Difficulty } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { demoPath, topicPath } from '@/data/tracks'
import { isTopicComplete, practiceAction } from '@/utils/curriculum'
import { DIFFICULTY_LABEL } from '@/utils/difficulty'
import type { SyllabusTopic } from '@/utils/syllabus'
import { buttonVariants } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import { MasteryMark } from '@/components/mastery/MasteryMark'
import { CriteriaSegments } from '@/components/mastery/CriteriaSegments'
import { TopicArtwork, getTopicTheme } from './TopicArtwork'

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-state-sorted" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M5 3.5v9l7-4.5-7-4.5Z" />
    </svg>
  )
}

const DIFFICULTY_TONE: Record<Difficulty, { bg: string; fg: string; border: string }> = {
  [Difficulty.BEGINNER]: {
    bg: 'var(--tone-emerald-bg)',
    fg: 'var(--tone-emerald-fg)',
    border: 'var(--tone-emerald-border)',
  },
  [Difficulty.INTERMEDIATE]: {
    bg: 'var(--tone-sky-bg)',
    fg: 'var(--tone-sky-fg)',
    border: 'var(--tone-sky-border)',
  },
  [Difficulty.ADVANCED]: {
    bg: 'var(--tone-rose-bg)',
    fg: 'var(--tone-rose-fg)',
    border: 'var(--tone-rose-border)',
  },
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
  const theme = getTopicTheme(topic.name)
  const diffTone = DIFFICULTY_TONE[topic.difficulty] ?? DIFFICULTY_TONE[Difficulty.BEGINNER]

  return (
    <li
      className={cn(
        // content-visibility lets the browser skip layout and paint for cards
        // off screen (Phase 5E: 66 cards with every section open); they stay
        // in the DOM and accessibility tree, so Tab and find still reach them.
        'group relative flex flex-col overflow-hidden rounded-md border border-t-[3px] border-rule bg-surface p-card transition-all duration-quick [contain-intrinsic-size:auto_22rem] [content-visibility:auto]',
        'hover:-translate-y-0.5 hover:shadow-e2',
      )}
      style={{ borderTopColor: theme.accent }}
    >
      {/* Visual mini-diagram banner */}
      <TopicArtwork slug={topic.name} className="mb-3 transition-transform duration-quick group-hover:scale-[1.01]" />

      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-rule bg-surface-sunk px-2 py-0.5">
          {masteryMarked && <MasteryMark status={status} />}
          {!masteryMarked && state === 'complete' && <CheckIcon />}
          {!masteryMarked && state === 'in-progress' && <span aria-hidden="true" className="size-2 rounded-full bg-brand" />}
          <span className="text-mono-sm font-semibold text-ink-2">{number}</span>
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

      <h3 className="mt-2.5 text-h3 text-ink transition-colors duration-quick group-hover:text-brand">
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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-micro">
        <span
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: diffTone.bg,
            color: diffTone.fg,
            borderColor: diffTone.border,
          }}
        >
          {DIFFICULTY_LABEL[topic.difficulty]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-sunk px-2 py-0.5 text-ink-2">
          <ClockIcon />
          <span className="text-mono-sm">{topic.estimatedMinutes} min</span>
        </span>
      </div>

      <div className="mt-auto flex flex-col items-stretch gap-2 pt-4">
        {action && (
          <span aria-hidden="true" className={cn(buttonVariants({ variant: isNext ? 'primary' : 'secondary', size: 'md' }), 'pointer-events-none w-full')}>
            {action}
          </span>
        )}
        <Link
          to={demoPath(topic.name)}
          aria-label={`Watch demo: ${number} ${topic.displayName}`}
          className="relative z-10 inline-flex items-center justify-center gap-1 self-center rounded-sm px-2 py-0.5 text-small font-medium text-ink-2 underline-offset-2 transition-colors hover:bg-surface-sunk hover:text-ink hover:underline"
        >
          <PlayMiniIcon />
          Watch demo
        </Link>
      </div>
    </li>
  )
}
