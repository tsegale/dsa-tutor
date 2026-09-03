import { ScaffoldingLevel } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { cn, scaffoldingPercent } from '@/lib/utils'

const BAR_COLOR: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.NONE]: 'bg-success',
  [ScaffoldingLevel.LOW]: 'bg-success',
  [ScaffoldingLevel.MEDIUM]: 'bg-secondary',
  [ScaffoldingLevel.HIGH]: 'bg-primary',
}

export default function ScaffoldingFader() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const percent = scaffoldingPercent(scaffoldingLevel)

  return (
    <div className="flex items-center gap-2 rounded-md border border-accent bg-accent px-2 py-1.5">
      <span className="text-[11px] text-accent-foreground">Scaffolding fading as you improve</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
        <div className={cn('h-full rounded-full', BAR_COLOR[scaffoldingLevel])} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[11px] font-medium text-accent-foreground">{percent}%</span>
    </div>
  )
}
