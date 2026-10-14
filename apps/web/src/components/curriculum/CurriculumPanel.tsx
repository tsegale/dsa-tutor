import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useLearningPlan } from '@/hooks/useLearningPlan'
import { topicPath } from '@/data/tracks'
import { moduleLabel } from '@/config/curriculum'
import { TOPIC_STATE_LABEL, unmetLabel } from '@/utils/moduleStatus'
import { defaultExpandedModule, expandedStorageKey, readExpanded, writeExpanded, type SyllabusModule } from '@/utils/syllabus'
import { useShellNavigate } from '@/components/layout/shellNavigation'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'
import { StatusMarker } from './StatusMarker'
import { MasteryMark } from '@/components/mastery/MasteryMark'
import { ChevronIcon, LockIcon } from './icons'

// The curriculum as a syllabus, in a persistent left rail: one accordion
// section per module, numbered topics joined by a connector, a status marker
// on each. Module numbering is earned: the curriculum is a sequence.

const COLLAPSED_KEY = 'dsa-tutor-curriculum-collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    // Blocked storage: start expanded.
    return false
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, String(value))
  } catch {
    // Blocked storage: the choice holds for this visit only.
  }
}

const storage = () => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
      <path d={collapsed ? 'm8.5 6.5 1.5 1.5-1.5 1.5' : 'm10 6.5-1.5 1.5 1.5 1.5'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface CurriculumPanelProps {
  /** The topic open in the workspace, highlighted and scrolled into view. */
  currentTopicName?: string | null
  /** 'rail' collapses to 48px; 'drawer' (small screens) always shows in full. */
  variant?: 'rail' | 'drawer'
  className?: string
}

export function CurriculumPanel({ currentTopicName = null, variant = 'rail', className }: CurriculumPanelProps) {
  const { user } = useAuth()
  const go = useShellNavigate()
  const { topicsQuery, syllabus, plan } = useLearningPlan()
  const { data: topics, isLoading, isFetching, refetch } = topicsQuery

  // The topic the rail points at: the one open in the workspace, else the
  // shared plan's answer (resume the latest session, or the recommendation),
  // the same topic Home's Continue card names.
  const focusTopicName = currentTopicName ?? plan?.focus?.topic.name ?? null

  const key = expandedStorageKey(user?.id)
  const [stored, setStored] = useState<string[] | null>(() => readExpanded(storage(), key))
  useEffect(() => setStored(readExpanded(storage(), key)), [key])

  const [collapsed, setCollapsed] = useState(() => variant === 'rail' && readCollapsed())
  const isCollapsed = variant === 'rail' && collapsed

  // Exactly one module open on first load (the one holding the focus topic);
  // after that, whatever the user opened, remembered per user. The current
  // topic's module is always open so the highlighted row is visible.
  const defaultId = defaultExpandedModule(syllabus, focusTopicName)
  const currentModuleId = syllabus.find((entry) => entry.topics.some((t) => t.topic.name === currentTopicName))?.module.id
  const expanded = new Set(stored ?? (defaultId ? [defaultId] : []))
  if (currentModuleId) expanded.add(currentModuleId)

  function toggleModule(id: string) {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const ids = [...next]
    setStored(ids)
    writeExpanded(storage(), key, ids)
  }

  function setPanelCollapsed(value: boolean) {
    setCollapsed(value)
    writeCollapsed(value)
  }

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!currentTopicName || isCollapsed) return
    listRef.current?.querySelector<HTMLElement>(`[data-topic="${CSS.escape(currentTopicName)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [currentTopicName, isCollapsed, syllabus.length])

  if (isCollapsed) {
    return (
      <nav aria-label="Curriculum" className={cn('flex h-full w-12 shrink-0 flex-col items-center gap-2 border-r border-rule bg-surface py-3', className)}>
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          aria-label="Expand curriculum"
          aria-expanded="false"
          className="flex size-8 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-sunk hover:text-ink"
        >
          <PanelIcon collapsed />
        </button>
        <ul className="flex flex-col items-center gap-2">
          {syllabus.map(({ module, status }) => (
            <li key={module.id}>
              <button
                type="button"
                onClick={() => {
                  setPanelCollapsed(false)
                  if (!expanded.has(module.id)) toggleModule(module.id)
                }}
                aria-label={`${moduleLabel(module)}, ${status.complete} of ${status.total} complete${status.state === 'locked' ? ', locked' : ''}`}
                className="relative flex size-9 items-center justify-center rounded-full"
              >
                {/* The button's label already states the progress. */}
                <span aria-hidden="true" className="pointer-events-none">
                  <ProgressRing value={status.total ? (status.complete / status.total) * 100 : 0} size={32} strokeWidth={3} showValue={false} tone={status.state === 'complete' ? 'success' : 'brand'} />
                </span>
                <span aria-hidden="true" className={cn('absolute text-mono-sm', status.state === 'locked' ? 'text-ink-3' : 'text-ink')}>
                  {module.number}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <nav aria-label="Curriculum" className={cn('flex h-full shrink-0 flex-col bg-surface', variant === 'rail' && 'w-72 border-r border-rule', className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-rule px-4">
        <h2 className="text-small font-semibold text-ink">Curriculum</h2>
        {variant === 'rail' && (
          <button
            type="button"
            onClick={() => setPanelCollapsed(true)}
            aria-label="Collapse curriculum"
            aria-expanded="true"
            className="flex size-8 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-sunk hover:text-ink"
          >
            <PanelIcon collapsed={false} />
          </button>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div aria-busy="true" aria-label="Loading the curriculum" className="flex flex-col gap-4 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : !topics ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4">
            <p className="text-small text-ink">The curriculum did not load.</p>
            <Button variant="secondary" size="sm" loading={isFetching} onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {syllabus.map((entry) => (
              <ModuleSection
                key={entry.module.id}
                entry={entry}
                open={expanded.has(entry.module.id)}
                onToggle={() => toggleModule(entry.module.id)}
                currentTopicName={currentTopicName}
                focusTopicName={focusTopicName}
                go={go}
              />
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

function ModuleSection({
  entry,
  open,
  onToggle,
  currentTopicName,
  focusTopicName,
  go,
}: {
  entry: SyllabusModule
  open: boolean
  onToggle: () => void
  currentTopicName: string | null
  focusTopicName: string | null
  go: (to: string) => void
}) {
  const { module, status, topics } = entry
  const bodyId = useId()
  const locked = status.state === 'locked'

  return (
    <section aria-labelledby={`${bodyId}-heading`}>
      <h3 id={`${bodyId}-heading`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-row text-left transition-colors duration-quick hover:bg-surface-sunk"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* The title wraps rather than truncating: it is the module's name. */}
            <span className="flex items-baseline gap-2">
              <span className="shrink-0 text-mono-sm text-ink-2">Module {module.number}</span>
              <span className={cn('min-w-0 text-small font-semibold', locked ? 'text-ink-2' : 'text-ink')}>{module.title}</span>
              {locked && <LockIcon />}
            </span>
            {/* The requirement shows once per module: on the header while the
                module is collapsed, above its topic list once it is open. */}
            {locked && status.unmet && !open ? (
              <span className="text-micro text-ink-2">{unmetLabel(status.unmet)}</span>
            ) : (
              <span className="flex items-center gap-2">
                <Progress
                  value={status.total ? (status.complete / status.total) * 100 : 0}
                  tone={status.state === 'complete' ? 'success' : 'brand'}
                  aria-label={`${moduleLabel(module)} progress`}
                  className="h-1 flex-1"
                />
                <span className="shrink-0 text-mono-sm text-ink-2">
                  {status.complete}/{status.total} · {status.mean}%
                </span>
              </span>
            )}
          </span>
          <ChevronIcon open={open} />
        </button>
      </h3>

      {open && locked && status.unmet && <p className="mx-4 mb-2 text-micro text-ink-2">{unmetLabel(status.unmet)}</p>}
      {open && (
        <ol id={bodyId} aria-label={`${moduleLabel(module)} topics`} className="pb-2">
          {topics.map(({ topic, number, state, openable, preview, reason }) => {
            const isCurrent = topic.name === currentTopicName
            const content = (
              <>
                <StatusMarker state={state} pulse={topic.name === focusTopicName && state !== 'complete' && state !== 'locked'} />
                <span className={cn('w-8 shrink-0 text-mono-sm', state === 'locked' ? 'text-ink-3' : 'text-ink-2')}>{number}</span>
                <span title={topic.displayName} className={cn('min-w-0 flex-1 truncate text-small', state === 'locked' ? 'text-ink-2' : 'text-ink', isCurrent && 'font-semibold')}>
                  {topic.displayName}
                </span>
                <MasteryMark status={topic.mastery.status} className="size-3.5" />
                {preview ? (
                  <span className="shrink-0 rounded-full bg-surface-sunk px-1.5 text-micro text-ink-2">Preview</span>
                ) : (
                  <span className="shrink-0 text-mono-sm text-ink-2">{topic.masteryPercent}%</span>
                )}
                <span className="sr-only">
                  , {preview ? 'preview, open before the module unlocks' : TOPIC_STATE_LABEL[state]}
                  {reason ? `. ${reason}` : ''}
                </span>
              </>
            )
            const rowClass = cn(
              'flex h-8 items-center gap-2.5 rounded-sm pr-3 pl-3',
              isCurrent ? 'bg-brand-soft' : 'hover:bg-surface-sunk'
            )
            return (
              <li
                key={topic.id}
                data-topic={topic.name}
                // The connector: a 1px rule from below this marker to the next,
                // drawn on the item itself so it reflows and collapses with it.
                className="relative mx-2 [&:not(:last-child)]:after:absolute [&:not(:last-child)]:after:top-[25px] [&:not(:last-child)]:after:left-[18.5px] [&:not(:last-child)]:after:h-3.5 [&:not(:last-child)]:after:w-px [&:not(:last-child)]:after:bg-rule [&:not(:last-child)]:after:content-['']"
              >
                {openable ? (
                  <Link
                    to={topicPath(topic.name)}
                    aria-current={isCurrent ? 'page' : undefined}
                    title={reason ?? undefined}
                    onClick={(event) => {
                      // Route through the shell, so leaving a workspace
                      // session asks for the session-end survey first.
                      event.preventDefault()
                      go(topicPath(topic.name))
                    }}
                    className={rowClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <span aria-disabled="true" title={reason ?? undefined} className={cn(rowClass, 'cursor-not-allowed')}>
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
