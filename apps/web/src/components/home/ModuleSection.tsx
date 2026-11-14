import { useEffect, useRef, useState, type ReactNode } from 'react'
import { moduleLabel } from '@/config/curriculum'
import type { SyllabusModule, SyllabusTopic } from '@/utils/syllabus'
import { Progress } from '@/components/ui/progress'
import { ChevronIcon } from '@/components/curriculum/icons'
import { ModuleIcon, getModuleTheme } from './TopicArtwork'

/** Topics an expanded section shows before "Show all N" (Phase 5B). */
export const INITIAL_TOPICS = 9

/**
 * One module of Home's syllabus (Phase 5B), and the whole of a module page
 * (5D): a header that always shows the module's number, title, subtitle and
 * progress, and, when expanded, its topics. A collapsed section renders no
 * topic DOM at all, so the full syllabus stays visible at a glance without
 * paying for 66 topics. Long modules show their first nine topics and a
 * "Show all" control that reveals the rest in place.
 */
export function ModuleSection({
  entry,
  expanded,
  onToggle,
  renderTopics,
  headingLevel: Heading = 'h2',
  showAllTopics = false,
}: {
  entry: SyllabusModule
  expanded: boolean
  /** h1 on a module page, where this section is the page. */
  headingLevel?: 'h1' | 'h2'
  /** A module page lists every topic at once: it is the module's own page. */
  showAllTopics?: boolean
  /** Omitted on a module page, where the one section is always open. */
  onToggle?: () => void
  /** Renders the visible topics; `firstRevealed` marks the topic focus moves to after "Show all". */
  renderTopics: (topics: SyllabusTopic[], firstRevealed: string | null) => ReactNode
}) {
  const { module, status, topics } = entry
  const headingId = `module-${module.number}-heading`
  const bodyId = `module-${module.number}-topics`
  const [showAll, setShowAll] = useState(showAllTopics)
  const [revealed, setRevealed] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const visible = showAll ? topics : topics.slice(0, INITIAL_TOPICS)
  const hidden = topics.length - visible.length
  const firstRevealed = revealed ? (topics[INITIAL_TOPICS]?.topic.name ?? null) : null
  const theme = getModuleTheme(module.number)

  // "Show all" disappears once used, so focus moves to the first topic it
  // revealed instead of falling back to the page.
  useEffect(() => {
    if (!revealed || !firstRevealed) return
    bodyRef.current?.querySelector<HTMLElement>(`[data-reveal-focus="${CSS.escape(firstRevealed)}"]`)?.focus()
  }, [revealed, firstRevealed])

  const summary = (
    <span className="flex shrink-0 items-center gap-3">
      <Progress
        value={status.total ? (status.complete / status.total) * 100 : 0}
        tone={status.state === 'complete' ? 'success' : 'brand'}
        className="hidden h-2 w-32 sm:block"
        aria-hidden="true"
      />
      <span className="inline-flex items-center rounded-full border border-rule bg-surface-sunk px-2.5 py-0.5 text-mono-sm whitespace-nowrap text-ink-2">
        {status.complete}/{status.total} · {status.mean}%
      </span>
    </span>
  )

  const title = (
    <span className="flex min-w-0 items-center gap-3">
      <ModuleIcon moduleNumber={module.number} />
      <span className="flex min-w-0 flex-wrap items-baseline gap-2">
        <span
          className="shrink-0 rounded-sm border px-1.5 py-0.5 text-mono-sm font-semibold"
          style={{
            backgroundColor: theme.bg,
            color: theme.fg,
            borderColor: theme.border,
          }}
        >
          Module {module.number}
        </span>
        <span aria-hidden="true" className="text-ink-3">
          ·
        </span>
        <span className="min-w-0 text-h2 text-ink">{module.title}</span>
      </span>
    </span>
  )

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-md border border-l-4 border-rule bg-surface shadow-e1"
      style={{ borderLeftColor: theme.accent }}
    >
      <div className="px-card pt-card pb-row">
        <Heading id={headingId} aria-label={moduleLabel(module)}>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={bodyId}
              className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-sm text-left"
            >
              {title}
              <span className="flex items-center gap-3">
                {summary}
                <ChevronIcon open={expanded} />
              </span>
            </button>
          ) : (
            <span className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2">
              {title}
              {summary}
            </span>
          )}
        </Heading>
        <p className="mt-1.5 pl-12 text-small text-ink-2">{module.subtitle}</p>
      </div>

      {expanded && (
        <div id={bodyId} ref={bodyRef} className="border-t border-rule bg-surface-sunk/40 px-card pt-card pb-card">
          {renderTopics(visible, firstRevealed)}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAll(true)
                setRevealed(true)
              }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-4 py-1.5 text-small font-medium text-accent-foreground shadow-e1 transition-colors hover:border-brand hover:bg-brand-soft"
            >
              Show all {topics.length}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
