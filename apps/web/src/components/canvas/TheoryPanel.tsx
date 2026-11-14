import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { COMPLEXITY } from '@/config/complexity'
import { theoryFor } from '@/config/theory'
import { cn } from '@/lib/utils'

/**
 * The conceptual briefing a student reads before any animation plays
 * (Phase 9A). An animation without an explanation is a moving picture: a
 * beginner opening Bubble Sort for the first time needs the mental model,
 * the mechanical rules and the cost, in that order, before Play means
 * anything.
 *
 * Everything here is static and hand-written. Nothing on this tab is
 * generated, because a first explanation has to be stable and reviewed
 * rather than freshly paraphrased each visit. Complexity is read from
 * config/complexity.ts - the same source as the Complexity tab and the
 * Feynman challenge prompts - so the two can never drift apart.
 */

function IdeaBulbIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M6 12h4M6.5 14h3M8 1.75a4.5 4.5 0 0 0-2.6 8.17V11a.5.5 0 0 0 .5.5h4.2a.5.5 0 0 0 .5-.5V9.92A4.5 4.5 0 0 0 8 1.75Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepsListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />
    </svg>
  )
}

function SketchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M4.5 6.5 6.5 8l-2 1.5M8 9.5h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CostGaugeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.2 2.2" strokeLinecap="round" />
    </svg>
  )
}

function CompassUseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Section({
  title,
  icon,
  accentClass,
  iconBg,
  iconFg,
  children,
}: {
  title: string
  icon: ReactNode
  accentClass?: string
  iconBg: string
  iconFg: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-md border border-border bg-card p-3 shadow-e1 dark:border-dark-border',
        accentClass,
      )}
    >
      <h3 className="flex items-center gap-2 text-micro font-semibold tracking-micro text-text-primary dark:text-dark-text-primary">
        <span
          aria-hidden="true"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm"
          style={{ backgroundColor: iconBg, color: iconFg }}
        >
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

export default function TheoryPanel() {
  const { algorithmName } = useParams<{ algorithmName: string }>()
  const slug = algorithmName ?? ''
  const theory = theoryFor(slug)
  const facts = COMPLEXITY[slug]

  if (!theory) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-8 text-center dark:border-dark-border">
        <p className="text-small font-medium text-text-primary dark:text-dark-text-primary">
          No written guide for this topic yet
        </p>
        <p className="max-w-[28ch] text-micro text-text-muted dark:text-dark-text-secondary">
          The pseudocode and complexity tabs still describe what the algorithm does.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-1">
      <Section
        title="The idea"
        icon={<IdeaBulbIcon />}
        accentClass="border-l-[3px] border-l-state-compare"
        iconBg="var(--tone-amber-bg)"
        iconFg="var(--tone-amber-fg)"
      >
        <p className="text-small leading-relaxed text-text-primary dark:text-dark-text-primary">
          {theory.analogy}
        </p>
      </Section>

      <Section
        title="How it works"
        icon={<StepsListIcon />}
        accentClass="border-l-[3px] border-l-state-current"
        iconBg="var(--tone-sky-bg)"
        iconFg="var(--tone-sky-fg)"
      >
        <ol className="flex list-none flex-col gap-2.5">
          {theory.mechanism.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tabular-nums"
                style={{
                  backgroundColor: 'var(--tone-sky-bg)',
                  color: 'var(--tone-sky-fg)',
                  borderColor: 'var(--tone-sky-border)',
                }}
              >
                {i + 1}
              </span>
              <span className="text-small leading-relaxed text-text-primary dark:text-dark-text-primary">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="One step, sketched"
        icon={<SketchIcon />}
        iconBg="var(--tone-violet-bg)"
        iconFg="var(--tone-violet-fg)"
      >
        <pre className="overflow-x-auto rounded-md border border-border bg-surface-sunk p-2.5 font-mono text-mono-sm leading-snug text-text-primary dark:border-dark-border dark:text-dark-text-primary">
          {theory.schematic}
        </pre>
      </Section>

      {facts ? (
        <Section
          title="What it costs"
          icon={<CostGaugeIcon />}
          iconBg="var(--tone-rose-bg)"
          iconFg="var(--tone-rose-fg)"
        >
          <dl className="flex flex-col gap-2">
            {(
              [
                ['Best', facts.best, facts.bestNote, 'var(--tone-emerald-bg)', 'var(--tone-emerald-fg)'],
                ['Average', facts.average, facts.averageNote, 'var(--tone-amber-bg)', 'var(--tone-amber-fg)'],
                ['Worst', facts.worst, facts.worstNote, 'var(--tone-rose-bg)', 'var(--tone-rose-fg)'],
                ['Space', facts.space, facts.spaceNote, 'var(--tone-sky-bg)', 'var(--tone-sky-fg)'],
              ] as const
            ).map(([label, value, note, pillBg, pillFg]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface-sunk/60 px-2.5 py-1.5 dark:border-dark-border"
              >
                <dt className="text-micro font-medium text-text-muted dark:text-dark-text-secondary">
                  {label}
                  {note ? (
                    <span className="ml-1 font-normal text-text-muted dark:text-dark-text-secondary">
                      ({note})
                    </span>
                  ) : null}
                </dt>
                <dd className="shrink-0">
                  <span
                    className="inline-flex rounded px-2 py-0.5 font-mono text-mono-sm font-semibold tabular-nums"
                    style={{ backgroundColor: pillBg, color: pillFg }}
                  >
                    {value}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {facts.auxiliarySpace ? (
            <p className="mt-2 text-micro leading-relaxed text-text-muted dark:text-dark-text-secondary">
              {facts.auxiliarySpace}
            </p>
          ) : null}
        </Section>
      ) : null}

      <Section
        title="When you would use it"
        icon={<CompassUseIcon />}
        accentClass="border-l-[3px] border-l-state-sorted"
        iconBg="var(--tone-emerald-bg)"
        iconFg="var(--tone-emerald-fg)"
      >
        <p className="text-small leading-relaxed text-text-primary dark:text-dark-text-primary">
          {theory.whenToUse}
        </p>
      </Section>
    </div>
  )
}
