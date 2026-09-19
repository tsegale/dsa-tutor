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

export default function ScaffoldingFader() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const percent = scaffoldingPercent(scaffoldingLevel)

  return (
    <div id="scaffolding-fader" className="flex items-center gap-2 rounded-md border border-accent bg-accent px-2 py-1.5">
      <span className="text-[11px] text-accent-foreground">{SCAFFOLDING_DESCRIPTION[scaffoldingLevel]}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
        <div className={cn('h-full rounded-full', BAR_COLOR[scaffoldingLevel])} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[11px] font-medium text-accent-foreground">
        level {SCAFFOLDING_LEVEL_NUMBER[scaffoldingLevel]} of {TOTAL_SCAFFOLDING_LEVELS}
      </span>
    </div>
  )
}
