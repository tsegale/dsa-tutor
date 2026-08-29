import { useState } from 'react'
import { AlgorithmTrack } from '@dsa-tutor/types'
import type { TopicDto } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'

interface CurriculumSidebarProps {
  topics: TopicDto[]
  activeTopic: string | null
  onTopicSelect: (name: string) => void
}

const TRACK_ORDER: AlgorithmTrack[] = [
  AlgorithmTrack.FOUNDATIONS,
  AlgorithmTrack.SORTING,
  AlgorithmTrack.TREES,
  AlgorithmTrack.GRAPHS,
]

const TRACK_LABELS: Record<AlgorithmTrack, string> = {
  [AlgorithmTrack.FOUNDATIONS]: 'Foundations',
  [AlgorithmTrack.SORTING]: 'Sorting',
  [AlgorithmTrack.TREES]: 'Trees',
  [AlgorithmTrack.GRAPHS]: 'Graphs',
}

const TRACK_DOT_CLASS: Record<AlgorithmTrack, string> = {
  [AlgorithmTrack.FOUNDATIONS]: 'bg-blue-500',
  [AlgorithmTrack.SORTING]: 'bg-primary',
  [AlgorithmTrack.TREES]: 'bg-success',
  [AlgorithmTrack.GRAPHS]: 'bg-secondary',
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn('transition-transform', collapsed && 'rotate-180')}
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  )
}

function StatusDot({ masteryPercent }: { masteryPercent: number }) {
  if (masteryPercent >= 80) {
    return <span className="size-2.5 shrink-0 rounded-full bg-primary" />
  }
  if (masteryPercent >= 1) {
    return (
      <span className="relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full border border-primary">
        <span className="absolute inset-y-0 left-0 w-1/2 bg-primary" />
      </span>
    )
  }
  return <span className="size-2.5 shrink-0 rounded-full border border-border" />
}

export default function CurriculumSidebar({ topics, activeTopic, onTopicSelect }: CurriculumSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      id="curriculum-sidebar"
      className={cn(
        'shrink-0 border-r border-border bg-white transition-[width] duration-150',
        collapsed ? 'w-12' : 'w-[260px]',
      )}
    >
      <div className={cn('flex items-center px-4 pt-4', collapsed ? 'justify-center px-0' : 'justify-between')}>
        {!collapsed && <span className="text-[13px] font-semibold tracking-wide text-text-muted uppercase">Curriculum</span>}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand curriculum sidebar' : 'Collapse curriculum sidebar'}
          className="flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-surface"
        >
          <ChevronIcon collapsed={collapsed} />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-2 py-4">
        {TRACK_ORDER.map((track) => {
          const trackTopics = topics.filter((t) => t.track === track)
          if (trackTopics.length === 0) return null

          return (
            <div key={track} className="flex flex-col gap-1">
              <div className={cn('flex items-center gap-1.5 px-2', collapsed && 'justify-center px-0')}>
                <span className={cn('size-1.5 shrink-0 rounded-full', TRACK_DOT_CLASS[track])} />
                {!collapsed && (
                  <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                    {TRACK_LABELS[track]}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {trackTopics.map((topic) => {
                  const isActive = activeTopic === topic.name
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      disabled={topic.isLocked}
                      onClick={() => onTopicSelect(topic.name)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive && 'bg-primary-light',
                        !topic.isLocked && !isActive && 'hover:bg-surface',
                        topic.isLocked && 'cursor-not-allowed',
                      )}
                    >
                      {topic.isLocked ? (
                        <span className="shrink-0 text-text-muted">
                          <LockIcon />
                        </span>
                      ) : (
                        <StatusDot masteryPercent={topic.masteryPercent} />
                      )}
                      {!collapsed && (
                        <>
                          <span
                            className={cn(
                              'flex-1 truncate text-[13px] text-text-primary',
                              topic.isLocked && 'opacity-40',
                            )}
                          >
                            {topic.displayName}
                          </span>
                          <span className={cn('text-[11px] text-text-muted', topic.isLocked && 'opacity-40')}>
                            {topic.masteryPercent}%
                          </span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
