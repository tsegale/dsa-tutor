import { cn } from '@/lib/utils'

// Small icons shared by the curriculum rail and Home's module sections.

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('size-4 shrink-0 text-ink-2 transition-transform duration-quick', open && 'rotate-180')} aria-hidden="true">
      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={cn('size-3.5 shrink-0 text-ink-3', className)} aria-hidden="true">
      <rect x="2.75" y="6.25" width="8.5" height="6" rx="1.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.75 6.25V4.6a2.25 2.25 0 0 1 4.5 0v1.65" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
