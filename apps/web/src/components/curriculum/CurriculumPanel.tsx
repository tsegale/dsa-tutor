import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useLearningPlan } from '@/hooks/useLearningPlan'
import { topicPath } from '@/data/tracks'
import { moduleLabel } from '@/config/curriculum'
import { TOPIC_STATE_LABEL } from '@/utils/moduleStatus'
import { defaultExpandedModule, expandedStorageKey, readExpanded, writeExpanded, type SyllabusModule } from '@/utils/syllabus'
import { useShellNavigate } from '@/components/layout/shellNavigation'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'
import { StatusMarker } from './StatusMarker'
import { MasteryMark } from '@/components/mastery/MasteryMark'
import { BrainIcon } from '@/components/feynman/FeynmanModeButton'
import { useStudyScope } from '@/hooks/useStudyScope'
import { hasFeynmanRubric } from '@/utils/feynmanRubrics'
import { ModuleIcon, getModuleTheme } from '@/components/home/TopicArtwork'
import { ChevronIcon } from './icons'

// The curriculum as a syllabus, in a persistent left rail: one accordion
// section per module, numbered topics joined by a connector, a status marker
// on each. Module numbering is earned: the curriculum is a sequence.

const COLLAPSED_KEY = 'dsa-tutor-curriculum-collapsed'
const WORKSPACE_COLLAPSED_KEY = 'dsa-tutor-workspace-curriculum-collapsed'

function readCollapsed(inWorkspace: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(inWorkspace ? WORKSPACE_COLLAPSED_KEY : COLLAPSED_KEY)
    if (raw === null) return inWorkspace
    return raw === 'true'
  } catch {
    return inWorkspace
  }
}

function writeCollapsed(inWorkspace: boolean, value: boolean) {
  try {
    window.localStorage.setItem(inWorkspace ? WORKSPACE_COLLAPSED_KEY : COLLAPSED_KEY, String(value))
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

function BookSyllabusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h4v11.5H4a1.5 1.5 0 0 1-1.5-1.5v-8.5Z" />
      <path d="M8 2h4a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 12 13.5H8" />
    </svg>
  )
}

export interface CurriculumPanelProps {
  /** The topic open in the workspace, highlighted and scrolled into view. */
  currentTopicName?: string | null
  /** 'rail' collapses to 48px; 'drawer' (small screens) always shows in full. */
  variant?: 'rail' | 'drawer'
  /** Inside /algorithm/:name, defaults to collapsed so the 3-column studio gets full width. */
  inWorkspace?: boolean
  className?: string
}

export function CurriculumPanel({ currentTopicName = null, variant = 'rail', inWorkspace = false, className }: CurriculumPanelProps) {
  const { user } = useAuth()
  const go = useShellNavigate()
  const feynmanOnDemand = !useStudyScope().restricted
  const { topicsQuery, syllabus, plan } = useLearningPlan()
  const { data: topics, isLoading, isFetching, refetch } = topicsQuery

  const focusTopicName = currentTopicName ?? plan?.focus?.topic.name ?? null

  const key = expandedStorageKey(user?.id)
  const [stored, setStored] = useState<string[] | null>(() => readExpanded(storage(), key))
  useEffect(() => setStored(readExpanded(storage(), key)), [key])

  const [collapsed, setCollapsed] = useState(() => variant === 'rail' && readCollapsed(inWorkspace))
  const isCollapsed = variant === 'rail' && collapsed

  const defaultId = defaultExpandedModule(syllabus, focusTopicName)
  const currentModuleId = syllabus.find((entry) => entry.topics.some((t) => t.topic.name === currentTopicName))?.module.id
  const expanded = new Set(stored ?? (defaultId ? [defaultId] : []))
  if (currentModuleId) expanded.add(currentModuleId)

  const totalComplete = syllabus.reduce((acc, m) => acc + m.status.complete, 0)
  const totalTopics = syllabus.reduce((acc, m) => acc + m.status.total, 0)

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
    writeCollapsed(inWorkspace, value)
  }

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!currentTopicName || isCollapsed) return
    listRef.current?.querySelector<HTMLElement>(`[data-topic="${CSS.escape(currentTopicName)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [currentTopicName, isCollapsed, syllabus.length])

  if (isCollapsed) {
    return (
      <nav aria-label="Curriculum" className={cn('flex h-full w-12 shrink-0 flex-col items-center gap-2.5 border-r border-rule bg-surface py-3', className)}>
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          aria-label="Expand curriculum"
          aria-expanded="false"
          className="flex size-8 items-center justify-center rounded-sm border border-rule bg-surface-sunk text-ink-2 transition-colors hover:border-brand hover:text-brand"
        >
          <PanelIcon collapsed />
        </button>
        <span className="h-px w-6 bg-rule" aria-hidden="true" />
        <ul className="flex flex-col items-center gap-2.5">
          {syllabus.map(({ module, status }) => {
            const theme = getModuleTheme(module.number)
            return (
              <li key={module.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPanelCollapsed(false)
                    if (!expanded.has(module.id)) toggleModule(module.id)
                  }}
                  aria-label={`${moduleLabel(module)}, ${status.complete} of ${status.total} complete`}
                  className="group relative flex size-9 items-center justify-center rounded-full transition-transform duration-quick hover:scale-105"
                  style={{ backgroundColor: theme.bg }}
                >
                  <span aria-hidden="true" className="pointer-events-none">
                    <ProgressRing
                      value={status.total ? (status.complete / status.total) * 100 : 0}
                      size={34}
                      strokeWidth={3}
                      showValue={false}
                      tone={status.state === 'complete' ? 'success' : 'brand'}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute text-mono-sm font-bold"
                    style={{ color: theme.fg }}
                  >
                    {module.number}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }

  return (
    <nav aria-label="Curriculum" className={cn('flex h-full shrink-0 flex-col bg-surface', variant === 'rail' && 'w-72 border-r border-rule', className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-rule bg-surface-sunk/50 px-3.5">
        <div className="flex items-center gap-2">
          <BookSyllabusIcon />
          <h2 className="text-small font-semibold text-ink">Curriculum</h2>
          {totalTopics > 0 && (
            <span className="rounded-full border border-rule bg-surface px-2 py-0.5 text-mono-sm text-[11px] font-semibold text-ink-2">
              {totalComplete}/{totalTopics}
            </span>
          )}
        </div>
        {variant === 'rail' && (
          <button
            type="button"
            onClick={() => setPanelCollapsed(true)}
            aria-label="Collapse curriculum"
            aria-expanded="true"
            className="flex size-7 items-center justify-center rounded-sm border border-transparent text-ink-2 hover:border-rule hover:bg-surface hover:text-ink"
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
                feynmanOnDemand={feynmanOnDemand}
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
  feynmanOnDemand,
}: {
  entry: SyllabusModule
  open: boolean
  onToggle: () => void
  currentTopicName: string | null
  focusTopicName: string | null
  go: (to: string) => void
  feynmanOnDemand: boolean
}) {
  const { module, status, topics } = entry
  const bodyId = useId()
  const theme = getModuleTheme(module.number)

  return (
    <section
      aria-labelledby={`${bodyId}-heading`}
      className={cn('border-l-[3px] transition-colors', open ? 'bg-surface-sunk/25' : 'border-l-transparent')}
      style={open ? { borderLeftColor: theme.accent } : undefined}
    >
      <h3 id={`${bodyId}-heading`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-start gap-2.5 px-3 py-row text-left transition-colors duration-quick hover:bg-surface-sunk/70"
        >
          <ModuleIcon moduleNumber={module.number} className="mt-0.5 size-8" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex items-center gap-1.5">
              <span
                className="shrink-0 rounded-sm border px-1.5 py-0.2 text-[10px] font-bold font-mono"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.fg,
                  borderColor: theme.border,
                }}
              >
                M{module.number}
              </span>
              <span className="min-w-0 truncate text-small font-semibold text-ink">{module.title}</span>
            </span>
            <span className="flex items-center gap-2">
              <Progress
                value={status.total ? (status.complete / status.total) * 100 : 0}
                tone={status.state === 'complete' ? 'success' : 'brand'}
                aria-label={`${moduleLabel(module)} progress`}
                className="h-1.5 flex-1"
              />
              <span className="shrink-0 text-mono-sm text-[11px] text-ink-2">
                {status.complete}/{status.total} · {status.mean}%
              </span>
            </span>
          </span>
          <ChevronIcon open={open} />
        </button>
      </h3>

      {open && (
        <ol id={bodyId} aria-label={`${moduleLabel(module)} topics`} className="space-y-0.5 pb-2.5 pt-0.5">
          {topics.map(({ topic, number, state }) => {
            const isCurrent = topic.name === currentTopicName
            const content = (
              <>
                <StatusMarker state={state} pulse={topic.name === focusTopicName && state !== 'complete'} />
                <span className="w-8 shrink-0 rounded bg-surface-sunk px-1 py-0.5 text-center text-mono-sm text-[11px] font-medium text-ink-2">
                  {number}
                </span>
                <span title={topic.displayName} className={cn('min-w-0 flex-1 truncate text-small text-ink', isCurrent && 'font-semibold text-brand')}>
                  {topic.displayName}
                </span>
                <MasteryMark status={topic.mastery.status} className="size-3.5" />
                <span
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-mono-sm text-[10px] font-semibold',
                    topic.masteryPercent >= 60
                      ? 'bg-success-light text-state-sorted'
                      : topic.masteryPercent > 0
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink-2',
                  )}
                >
                  {topic.masteryPercent}%
                </span>
                <span className="sr-only">, {TOPIC_STATE_LABEL[state]}</span>
              </>
            )
            const explainable = feynmanOnDemand && topic.practiceRunCompleted && hasFeynmanRubric(topic.displayName)
            const rowClass = cn(
              'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm pr-2.5 pl-2.5 transition-colors',
              isCurrent
                ? 'bg-brand-soft ring-1 ring-brand/30'
                : 'hover:bg-surface-sunk',
            )
            return (
              <li
                key={topic.id}
                data-topic={topic.name}
                className="relative mx-2 flex items-center [&:not(:last-child)]:after:absolute [&:not(:last-child)]:after:top-[26px] [&:not(:last-child)]:after:left-[16px] [&:not(:last-child)]:after:h-3 [&:not(:last-child)]:after:w-px [&:not(:last-child)]:after:bg-rule [&:not(:last-child)]:after:content-['']"
              >
                <Link
                  to={topicPath(topic.name)}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    go(topicPath(topic.name))
                  }}
                  className={rowClass}
                >
                  {content}
                </Link>
                {explainable && (
                  <Link
                    to={`/algorithm/${topic.name}?mode=PRACTICE&feynman=1`}
                    aria-label={`Feynman mode: explain ${topic.displayName}`}
                    title="Feynman mode"
                    onClick={(event) => {
                      event.preventDefault()
                      go(`/algorithm/${topic.name}?mode=PRACTICE&feynman=1`)
                    }}
                    className="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-sunk hover:text-ink"
                  >
                    <BrainIcon />
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
