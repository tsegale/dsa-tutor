import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { TopicDto } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { useTopics } from '@/hooks/useTopics'
import { useRestoreFocus } from '@/hooks/useRestoreFocus'
import { searchTopics } from '@/utils/curriculum'
import { Kbd } from '@/components/ui/Kbd'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'

// Ctrl/Cmd+K over every topic the user can see (all of the curriculum, or a
// participant's study topics). A combobox: focus stays in the input, the
// arrow keys move the active option, Enter opens it. Locked topics are
// listed with their reason but cannot be chosen.

function SearchIcon() {
  return (
    <svg className="size-4 shrink-0 text-ink-2" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (topic: TopicDto) => void
}) {
  const restoreFocus = useRestoreFocus()
  const { data: topics = [], isLoading, isError, refetch, isRefetching } = useTopics()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => searchTopics(topics, query), [topics, query])
  const selectable = useMemo(() => results.map((r, i) => (r.topic.isLocked ? -1 : i)).filter((i) => i >= 0), [results])

  // A new query starts from the best match.
  useEffect(() => {
    setActive(selectable[0] ?? -1)
  }, [selectable])

  // Each open starts fresh.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function move(step: number) {
    if (selectable.length === 0) return
    const position = selectable.indexOf(active)
    const next = position === -1 ? 0 : (position + step + selectable.length) % selectable.length
    setActive(selectable[next])
  }

  function choose(index: number) {
    const match = results[index]
    if (!match || match.topic.isLocked) return
    onOpenChange(false)
    onSelect(match.topic)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Home' && selectable.length) {
      event.preventDefault()
      setActive(selectable[0])
    } else if (event.key === 'End' && selectable.length) {
      event.preventDefault()
      setActive(selectable[selectable.length - 1])
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(active)
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
          onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
          className="fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-rule bg-card text-ink shadow-e3 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <DialogPrimitive.Title className="sr-only">Go to a topic</DialogPrimitive.Title>
          {/* Announced on its own: the visible count is in an aria-hidden footer. */}
          <p className="sr-only" aria-live="polite">
            {isLoading || isError ? '' : `${results.length} ${results.length === 1 ? 'topic' : 'topics'}`}
          </p>
          <div className="flex items-center gap-2 border-b border-rule px-4">
            <SearchIcon />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              aria-label="Search topics"
              placeholder="Search topics, tracks and descriptions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-placeholder"
            />
            <Kbd className="hidden sm:inline-flex">Esc</Kbd>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {isLoading ? (
              <div className="flex flex-col gap-3 p-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div role="alert" className="flex flex-col items-start gap-3 p-3">
                <p className="text-small text-ink">The topic list did not load, so there is nothing to search yet.</p>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : results.length === 0 ? (
              <p className="p-3 text-small text-ink-2">No topic matches "{query.trim()}". Try a track name such as "trees".</p>
            ) : (
              <ul ref={listRef} id={listId} role="listbox" aria-label="Topics" className="flex flex-col">
                {results.map(({ topic, trackName }, index) => {
                  const isActive = index === active
                  return (
                    <li
                      key={topic.id ?? topic.name}
                      id={optionId(index)}
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={topic.isLocked || undefined}
                      onMouseMove={() => !topic.isLocked && setActive(index)}
                      onClick={() => choose(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2',
                        isActive && 'bg-brand-soft',
                        topic.isLocked && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium text-ink">{topic.displayName}</p>
                        <p className="truncate text-micro text-ink-2">
                          {topic.isLocked ? `Locked: complete the earlier ${trackName} topics first` : topic.description}
                        </p>
                      </div>
                      {topic.isLocked && <LockIcon />}
                      <span className="shrink-0 text-micro text-ink-2">{trackName}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="hidden items-center gap-4 border-t border-rule px-4 py-2 text-micro text-ink-2 sm:flex" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <Kbd>&uarr;</Kbd>
              <Kbd>&darr;</Kbd> move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Enter</Kbd> open
            </span>
            <span className="ml-auto text-mono-sm">
              {results.length} {results.length === 1 ? 'topic' : 'topics'}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
