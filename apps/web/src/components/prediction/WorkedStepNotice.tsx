import { cn } from '@/lib/utils'

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * The label on a worked step (Week 2 2A.3): a demonstration the learner
 * watches, not a question. Indigo, not amber - amber means the system is
 * asking something, and a worked step asks nothing. The wording says so
 * outright so no one waits wondering whether they were meant to answer.
 */
export default function WorkedStepNotice({ narration, className }: { narration: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('rounded-md border-l-4 border-primary bg-primary-light p-2.5', className)}
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <EyeIcon />
        Watch this one
      </p>
      <p className="mt-0.5 text-[11px] text-text-muted">A worked example - nothing to answer. It moves on by itself.</p>
      <p className="mt-1.5 text-xs text-text-primary">{narration}</p>
    </div>
  )
}
