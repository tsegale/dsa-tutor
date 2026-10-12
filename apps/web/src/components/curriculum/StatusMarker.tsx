import { cn } from '@/lib/utils'
import type { TopicState } from '@/utils/moduleStatus'

// Topic status markers for the syllabus: inline SVG at 14px, never emoji or
// glyphs. Decorative (aria-hidden): each row states its status in text too.
//   complete     check in the success colour (the success-with-checkmark rule)
//   in progress  filled brand dot; the focus topic adds a slow pulse ring
//   available    hollow ring
//   locked       padlock
// Success, not --state-sorted: the state palette is reserved for canvases.

export function StatusMarker({ state, pulse = false, className }: { state: TopicState; pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex size-3.5 shrink-0 items-center justify-center', className)}>
      {state === 'complete' && (
        <svg viewBox="0 0 14 14" className="size-3.5 text-success">
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path d="m4.2 7.2 1.9 1.9 3.7-4" fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === 'in-progress' && (
        <>
          {pulse && <span className="marker-pulse absolute inset-0 rounded-full bg-brand" />}
          <svg viewBox="0 0 14 14" className="relative size-3.5 text-brand">
            <circle cx="7" cy="7" r="5" fill="currentColor" />
          </svg>
        </>
      )}
      {state === 'available' && (
        <>
          {pulse && <span className="marker-pulse absolute inset-0 rounded-full bg-ink-3" />}
          <svg viewBox="0 0 14 14" className="relative size-3.5 text-ink-3">
            <circle cx="7" cy="7" r="5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </>
      )}
      {state === 'locked' && (
        <svg viewBox="0 0 14 14" className="size-3.5 text-ink-3">
          <rect x="2.75" y="6.25" width="8.5" height="6" rx="1.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.75 6.25V4.6a2.25 2.25 0 0 1 4.5 0v1.65" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </span>
  )
}
