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
import { TopicArtwork, getTopicStructureLabel, getTopicTheme } from './TopicArtwork'

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
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M5 3.5v9l7-4.5-7-4.5Z" />
    </svg>
  )
}

function PredictSparkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function HandsOnCursorIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m4 2.5 8.5 5-4 1.2-1.8 4.3L4 2.5Z" strokeLinejoin="round" />
    </svg>
  )
}

function CodeTagIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5.5 4.5 2.5 8l3 3.5M10.5 4.5l3 3.5-3 3.5" strokeLinecap="round" strokeLinejoin="round" />
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
  const structureLabel = getTopicStructureLabel(topic.name)
  const diffTone = DIFFICULTY_TONE[topic.difficulty] ?? DIFFICULTY_TONE[Difficulty.BEGINNER]

  return (
    <li
      className={cn(
        // content-visibility lets the browser skip layout and paint for cards
        // off screen (Phase 5E: 66 cards with every section open); they stay
        // in the DOM and accessibility tree, so Tab and find still reach them.
        'group relative flex flex-col overflow-hidden rounded-md border border-t-[3px] border-rule bg-surface shadow-e1 transition-all duration-quick [contain-intrinsic-size:auto_24rem] [content-visibility:auto]',
        'hover:-translate-y-0.5 hover:shadow-e2',
      )}
      style={{ borderTopColor: theme.accent }}
    >
      {/* Top full-bleed illustrated header with floating badges */}
      <div className="relative border-b border-rule">
        <TopicArtwork
          slug={topic.name}
          className="h-32 rounded-none border-0 pt-7 pb-1 transition-transform duration-quick group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute top-2.5 right-3 left-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface/95 px-2.5 py-0.5 shadow-e1">
            {masteryMarked && <MasteryMark status={status} />}
            {!masteryMarked && state === 'complete' && <CheckIcon />}
            {!masteryMarked && state === 'in-progress' && <span aria-hidden="true" className="size-2 rounded-full bg-brand" />}
            <span className="text-mono-sm font-bold text-ink">{number}</span>
          </span>
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-e1"
            style={{
              backgroundColor: 'var(--surface)',
              color: theme.fg,
              borderColor: theme.border,
            }}
          >
            {structureLabel}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-h3 font-semibold text-ink transition-colors duration-quick group-hover:text-brand">
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
          </div>

          <span className="flex w-13 shrink-0 flex-col items-center gap-1.5 rounded-md border border-rule bg-surface-sunk/60 p-1.5">
            <ProgressRing
              value={topic.masteryPercent}
              size={44}
              strokeWidth={4}
              tone={isTopicComplete(topic) ? 'success' : 'brand'}
              ariaLabel={`${topic.displayName} mastery`}
            />
            {status !== 'NOT_STARTED' && <CriteriaSegments mastery={topic.mastery} />}
          </span>
        </div>

        {/* Difficulty, time & interactive mode pills */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-micro">
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: diffTone.bg,
              color: diffTone.fg,
              borderColor: diffTone.border,
            }}
          >
            {DIFFICULTY_LABEL[topic.difficulty]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-sunk px-2.5 py-0.5 text-ink-2">
            <ClockIcon />
            <span className="text-mono-sm font-medium">{topic.estimatedMinutes} min</span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-sunk/80 px-2 py-0.5 text-[10px] font-medium text-ink-2"
          >
            <PredictSparkIcon />
            Predict
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-sunk/80 px-2 py-0.5 text-[10px] font-medium text-ink-2"
          >
            <HandsOnCursorIcon />
            Hands-On
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-sunk/80 px-2 py-0.5 text-[10px] font-medium text-ink-2"
          >
            <CodeTagIcon />
            Code
          </span>
        </div>
      </div>

      {/* Styled bottom action dock */}
      <div className="mt-auto flex items-center gap-2 border-t border-rule bg-surface-sunk/60 px-card py-2.5">
        {action && (
          <span
            aria-hidden="true"
            className={cn(buttonVariants({ variant: isNext ? 'primary' : 'secondary', size: 'sm' }), 'pointer-events-none flex-1 font-semibold')}
          >
            {action}
          </span>
        )}
        <Link
          to={demoPath(topic.name)}
          aria-label={`Watch demo: ${number} ${topic.displayName}`}
          className="relative z-10 inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-sm border border-rule-strong bg-surface px-3 text-small font-medium text-ink-2 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
        >
          <PlayMiniIcon />
          Watch demo
        </Link>
      </div>
    </li>
  )
}
