import { cn } from '@/lib/utils'

interface DSATutorLogoProps {
  variant?: 'dark' | 'inverted'
  className?: string
  showTagline?: boolean
  /** Extra classes for the descriptor, e.g. hiding it below a breakpoint. */
  taglineClassName?: string
}

// The wordmark, on design tokens. 'dark' sits on the app's own headers and
// follows the theme: a brand tile whose graph is drawn in the brand's text
// colour (--primary-foreground, white on the light brand, near-black on the
// lighter dark-mode brand).
//
// 'inverted' sits on an inked panel - the sign-in page's left half - and is
// drawn in --paper, the ink's own foreground. It was pinned to white while
// that panel was a fixed indigo slab; the panel is bg-ink now and inverts
// with the theme, so a pinned white wordmark vanished in dark mode.
//
// The descriptor says what the system is (Phase 4B). It is --ink-2, not
// --ink-3: --ink-3 is 3.2:1 on the surface, which fails WCAG AA for text.
export default function DSATutorLogo({ variant = 'dark', className = '', showTagline = true, taglineClassName }: DSATutorLogoProps) {
  const onPanel = variant === 'inverted'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Decorative: the wordmark beside it is the accessible name. */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className={onPanel ? 'text-paper' : 'text-primary-foreground'}>
        <rect width="40" height="40" rx="10" className={onPanel ? 'fill-paper/20 stroke-paper/30' : 'fill-brand'} strokeWidth="1" />
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
        <span className={cn('text-h3 leading-none font-bold tracking-tight', onPanel ? 'text-paper' : 'text-ink')}>
          DSA <span className={onPanel ? 'text-paper/70' : 'text-brand'}>Tutor</span>
        </span>
        {showTagline && (
          <span className={cn('mt-1 text-micro', onPanel ? 'text-paper/60' : 'text-ink-2', taglineClassName)}>Adaptive tutoring system</span>
        )}
      </div>
    </div>
  )
}
