import type { MasteryStatus } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { MASTERY_STATUS_LABEL } from '@/utils/mastery'

/**
 * The mastery badge (Phase 7D): a filled check for Mastered, a half-filled
 * ring for Proficient, nothing otherwise. Both in --state-sorted, the colour
 * the curriculum already uses for "done". Labelled for screen readers; the
 * visible word sits beside it where there is room.
 */
export function MasteryMark({ status, className }: { status: MasteryStatus; className?: string }) {
  if (status !== 'MASTERED' && status !== 'PROFICIENT') return null
  return (
    <svg viewBox="0 0 16 16" role="img" aria-label={MASTERY_STATUS_LABEL[status]} className={cn('size-4 shrink-0 text-state-sorted', className)}>
      {status === 'MASTERED' ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="m4.8 8.3 2.2 2.2 4.2-4.8" fill="none" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* The left half filled: half way, by the interview bar. */}
          <path d="M8 1.75a6.25 6.25 0 0 0 0 12.5Z" fill="currentColor" />
        </>
      )}
    </svg>
  )
}
