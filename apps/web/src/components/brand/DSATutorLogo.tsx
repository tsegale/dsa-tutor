import { cn } from '@/lib/utils'

interface DSATutorLogoProps {
  variant?: 'dark' | 'white'
  className?: string
  showTagline?: boolean
  /** Extra classes for the descriptor, e.g. hiding it below a breakpoint. */
  taglineClassName?: string
}

// The wordmark, on design tokens. 'dark' sits on the app's own headers and
// follows the theme: a brand tile whose graph is drawn in the brand's text
// colour (--primary-foreground, white on the light brand, near-black on the
// lighter dark-mode brand). 'white' sits on the sign-in page's fixed indigo
// panel, which does not change with the theme.
//
// The descriptor says what the system is (Phase 4B). It is --ink-2, not
// --ink-3: --ink-3 is 3.2:1 on the surface, which fails WCAG AA for text.
export default function DSATutorLogo({ variant = 'dark', className = '', showTagline = true, taglineClassName }: DSATutorLogoProps) {
  const onPanel = variant === 'white'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Decorative: the wordmark beside it is the accessible name. */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className={onPanel ? 'text-white' : 'text-primary-foreground'}>
        <rect width="40" height="40" rx="10" className={onPanel ? 'fill-white/20 stroke-white/30' : 'fill-brand'} strokeWidth="1" />
        <g stroke="currentColor" strokeWidth="1.5" opacity="0.55">
          <line x1="11" y1="18" x2="17" y2="13" />
          <line x1="11" y1="22" x2="17" y2="27" />
          <line x1="23" y1="11" x2="29" y2="18" />
          <line x1="23" y1="29" x2="29" y2="22" />
        </g>
        <circle cx="8" cy="20" r="3.5" fill="currentColor" />
        <circle cx="32" cy="20" r="3.5" fill="currentColor" />
        <circle cx="20" cy="10" r="3.5" fill="currentColor" opacity="0.75" />
        <circle cx="20" cy="30" r="3.5" fill="currentColor" opacity="0.75" />
        <circle cx="35" cy="6" r="3" fill="currentColor" />
        <circle cx="35" cy="6" r="5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>
      <div className="flex flex-col">
        <span className={cn('text-h3 leading-none font-bold tracking-tight', onPanel ? 'text-white' : 'text-ink')}>
          DSA <span className={onPanel ? 'text-brand-on-indigo-muted' : 'text-brand'}>Tutor</span>
        </span>
        {showTagline && (
          <span className={cn('mt-1 text-micro', onPanel ? 'text-brand-on-indigo-muted' : 'text-ink-2', taglineClassName)}>Adaptive tutoring system</span>
        )}
      </div>
    </div>
  )
}
