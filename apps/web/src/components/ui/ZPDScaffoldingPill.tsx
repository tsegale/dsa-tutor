import { ScaffoldingLevel } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, scaffoldingPercent } from '@/lib/utils'

const DOT_COLOR: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.NONE]: 'bg-success',
  [ScaffoldingLevel.LOW]: 'bg-success',
  [ScaffoldingLevel.MEDIUM]: 'bg-secondary',
  [ScaffoldingLevel.HIGH]: 'bg-primary',
}

// Plain-language labels so a student who has never heard of the Zone of
// Proximal Development can still understand their current support level.
const SCAFFOLDING_LABEL: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.HIGH]: 'Full support active',
  [ScaffoldingLevel.MEDIUM]: 'Guided mode',
  [ScaffoldingLevel.LOW]: 'Minimal hints',
  [ScaffoldingLevel.NONE]: 'Independent mode',
}

export default function ZPDScaffoldingPill() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const scaffoldingReasoning = useAlgorithmStore((state) => state.scaffoldingReasoning)
  const percent = scaffoldingPercent(scaffoldingLevel)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-[20px] border border-accent bg-accent px-3 py-1 text-xs font-medium whitespace-nowrap text-accent-foreground">
          <span className={cn('size-2 shrink-0 rounded-full', DOT_COLOR[scaffoldingLevel])} aria-hidden="true" />
          {SCAFFOLDING_LABEL[scaffoldingLevel]}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Support level: {scaffoldingLevel}. {scaffoldingReasoning}
      </TooltipContent>
    </Tooltip>
  )
}
