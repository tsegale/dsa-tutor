import { ScaffoldingLevel } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const STYLES: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.HIGH]: 'border border-primary bg-primary text-white',
  [ScaffoldingLevel.MEDIUM]: 'border border-primary bg-transparent text-primary',
  [ScaffoldingLevel.LOW]: 'border border-muted bg-transparent text-text-muted',
  [ScaffoldingLevel.NONE]: 'border border-success bg-success/10 text-success',
}

export default function ScaffoldingBadge() {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const scaffoldingReasoning = useAlgorithmStore((state) => state.scaffoldingReasoning)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${STYLES[scaffoldingLevel]}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z" />
          </svg>
          {scaffoldingLevel}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Support level: {scaffoldingLevel}. {scaffoldingReasoning}
      </TooltipContent>
    </Tooltip>
  )
}
