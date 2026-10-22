import { cn } from '@/lib/utils'
import type { TopicState } from '@/utils/moduleStatus'

// Topic status markers for the syllabus: inline SVG at 14px, never emoji or
// glyphs. Decorative (aria-hidden): each row states its status in text too.
//   complete     check in the success colour (the success-with-checkmark rule)
//   in progress  filled brand dot; the focus topic adds a slow pulse ring
//   available    hollow ring
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
    </span>
  )
}
