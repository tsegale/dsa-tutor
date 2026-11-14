import { ScaffoldingLevel } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { cn, scaffoldingPercent } from '@/lib/utils'

const BAR_COLOR: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.NONE]: 'bg-success',
  [ScaffoldingLevel.LOW]: 'bg-success',
  [ScaffoldingLevel.MEDIUM]: 'bg-secondary',
  [ScaffoldingLevel.HIGH]: 'bg-primary',
}

// Plain-language description of each support level, shown instead of the
// raw "fading as you improve" framing and percentage alone.
const SCAFFOLDING_DESCRIPTION: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.HIGH]: 'Support: Full, hints and guidance active',
  [ScaffoldingLevel.MEDIUM]: 'Support: Guided, hints on request',
  [ScaffoldingLevel.LOW]: 'Support: Low, try independently',
  [ScaffoldingLevel.NONE]: 'Support: Independent, no hints',
}

// There are exactly 4 scaffolding levels (HIGH/MEDIUM/LOW/NONE); a bare
// "100%" next to this text didn't say what it was 100% of (see
// remediation doc 9.10) - "level 4 of 4" names the actual scale.
const SCAFFOLDING_LEVEL_NUMBER: Record<ScaffoldingLevel, number> = {
  [ScaffoldingLevel.HIGH]: 4,
  [ScaffoldingLevel.MEDIUM]: 3,
  [ScaffoldingLevel.LOW]: 2,
  [ScaffoldingLevel.NONE]: 1,
}
const TOTAL_SCAFFOLDING_LEVELS = 4

function ShieldLayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0" aria-hidden="true">
      <path d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3Z" strokeLinejoin="round" />
    </svg>
  )
}

export default function ScaffoldingFader() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const percent = scaffoldingPercent(scaffoldingLevel)

  return (
    <div id="scaffolding-fader" className="flex flex-col gap-1.5 rounded-md border border-accent bg-accent px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-foreground">
          <ShieldLayersIcon />
          {SCAFFOLDING_DESCRIPTION[scaffoldingLevel]}
        </span>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent-foreground dark:border-dark-border">
          level {SCAFFOLDING_LEVEL_NUMBER[scaffoldingLevel]} of {TOTAL_SCAFFOLDING_LEVELS}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className={cn('h-full rounded-full transition-all duration-quick', BAR_COLOR[scaffoldingLevel])} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
