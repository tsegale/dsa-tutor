import { cn } from '@/lib/utils'

interface DSATutorLogoProps {
  variant?: 'dark' | 'inverted'
  className?: string
  showTagline?: boolean
  /** Extra classes for the descriptor, e.g. hiding it below a breakpoint. */
  taglineClassName?: string
}

export default function DSATutorLogo({ variant = 'dark', className = '', showTagline = true, taglineClassName }: DSATutorLogoProps) {
  const onPanel = variant === 'inverted'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Decorative: the wordmark beside it is the accessible name. */}
      <svg
        width="42"
        height="42"
        viewBox="0 0 42 42"
        fill="none"
        aria-hidden="true"
        className={cn('shrink-0 rounded-[11px] shadow-e1', onPanel ? 'text-paper' : 'text-primary-foreground')}
      >
        <rect
          x="0.5"
          y="0.5"
          width="41"
          height="41"
          rx="10.5"
          className={onPanel ? 'fill-paper/15 stroke-paper/30' : 'fill-brand stroke-brand-hover'}
          strokeWidth="1"
        />
        {/* Connecting edges */}
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <line x1="21" y1="11" x2="11" y2="23" />
          <line x1="21" y1="11" x2="31" y2="23" />
          <line x1="11" y1="23" x2="16" y2="33" />
          <line x1="31" y1="23" x2="26" y2="33" />
          <line x1="11" y1="23" x2="31" y2="23" strokeDasharray="2.5 2.5" />
        </g>
        {/* Root node */}
        <circle cx="21" cy="11" r="4.2" fill="currentColor" />
        {/* Left & Right child nodes with algorithm state accents */}
        <circle cx="11" cy="23" r="3.8" fill="var(--state-compare)" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="31" cy="23" r="3.8" fill="var(--state-sorted)" stroke="currentColor" strokeWidth="1.2" />
        {/* Bottom leaf nodes */}
        <circle cx="16" cy="33" r="3" fill="currentColor" opacity="0.85" />
        <circle cx="26" cy="33" r="3" fill="var(--state-current)" stroke="currentColor" strokeWidth="1" />
        {/* Active pulse ring at top right */}
        <circle cx="35" cy="7" r="2.5" fill="var(--state-sorted)" />
        <circle cx="35" cy="7" r="4.5" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      </svg>
      <div className="flex flex-col">
        <span className={cn('text-h3 leading-none font-bold tracking-tight', onPanel ? 'text-paper' : 'text-ink')}>
          DSA <span className={onPanel ? 'text-state-compare' : 'text-brand'}>Tutor</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              'mt-1 text-micro font-medium',
              onPanel ? 'text-paper/65' : 'text-ink-2',
              taglineClassName,
            )}
          >
            Adaptive tutoring system
          </span>
        )}
      </div>
    </div>
  )
}
