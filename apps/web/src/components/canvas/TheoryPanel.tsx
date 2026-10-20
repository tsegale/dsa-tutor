import { useParams } from 'react-router-dom'
import { COMPLEXITY } from '@/config/complexity'
import { theoryFor } from '@/config/theory'

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-micro font-medium tracking-micro text-text-muted dark:text-dark-text-secondary">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
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
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
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
    <div className="flex flex-col gap-4 px-3 py-3">
      <Section title="The idea">
        <p className="text-small leading-relaxed text-text-primary dark:text-dark-text-primary">
          {theory.analogy}
        </p>
      </Section>

      <Section title="How it works">
        <ol className="flex list-none flex-col gap-2">
          {theory.mechanism.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span
                aria-hidden
                className="mt-px shrink-0 font-mono text-mono-sm tabular-nums text-text-muted dark:text-dark-text-secondary"
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

      <Section title="One step, sketched">
        <pre className="overflow-x-auto rounded-md border border-border bg-surface-sunk p-2 font-mono text-mono-sm leading-snug text-text-primary dark:text-dark-text-primary">
          {theory.schematic}
        </pre>
      </Section>

      {facts ? (
        <Section title="What it costs">
          <dl className="flex flex-col gap-1.5">
            {(
              [
                ['Best', facts.best, facts.bestNote],
                ['Average', facts.average, facts.averageNote],
                ['Worst', facts.worst, facts.worstNote],
                ['Space', facts.space, facts.spaceNote],
              ] as const
            ).map(([label, value, note]) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <dt className="text-micro text-text-muted dark:text-dark-text-secondary">{label}</dt>
                <dd className="flex items-baseline gap-1.5 text-right">
                  <span className="font-mono text-mono-sm tabular-nums text-text-primary dark:text-dark-text-primary">
                    {value}
                  </span>
                  {note ? (
                    <span className="text-micro text-text-muted dark:text-dark-text-secondary">
                      {note}
                    </span>
                  ) : null}
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

      <Section title="When you would use it">
        <p className="text-small leading-relaxed text-text-primary dark:text-dark-text-primary">
          {theory.whenToUse}
        </p>
      </Section>
    </div>
  )
}
