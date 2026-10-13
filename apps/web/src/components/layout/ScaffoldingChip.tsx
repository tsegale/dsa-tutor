import { SUPPORT_LEVEL, nextLevelDownLine } from '@/config/supportLevels'
import type { SupportAssessment } from '@/utils/supportBand'
import { useHeaderSupport } from '@/hooks/useHeaderSupport'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SupportMeter } from '@/components/ui/SupportMeter'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// The scaffolding state, made visible in the global bar (Phase 4C). The chip
// names the level and opens a popover in which the mechanism explains
// itself: the level, the reasoning masteryScore.ts gave, the mastery score,
// and what changes at the next level down.

function ChipView({ assessment, basis }: { assessment: SupportAssessment; basis: string }) {
  const { level } = assessment
  const { label, segments } = SUPPORT_LEVEL[level]
  return (
    <Popover>
      {/* Below 1280px only the meter shows; the tooltip carries the words. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Support level: ${label}. Show why`}
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border border-rule px-2.5 text-small whitespace-nowrap transition-colors duration-quick hover:border-rule-strong hover:bg-surface-sunk"
            >
              <span className="hidden text-micro text-ink-2 xl:inline">Support</span>
              <SupportMeter filled={segments} />
              <span className="hidden font-medium text-ink xl:inline">{label}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="xl:hidden">Support level: {label}</TooltipContent>
      </Tooltip>
      <PopoverContent aria-label="Why this level of support">
        <p className="text-micro text-ink-2">{basis}</p>
        <div className="mt-2 flex items-center gap-2.5">
          <SupportMeter filled={segments} className="[&>span]:h-4 [&>span]:w-1.5" />
          <p className="text-h3 text-ink">{label}</p>
          <span className="ml-auto text-mono-sm text-ink-2">Level {segments} of 4</span>
        </div>
        <p className="mt-3 text-small text-ink">{assessment.reasoning}</p>
        <dl className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
          <dt className="text-small text-ink-2">Mastery score</dt>
          <dd className="text-mono text-ink">{assessment.score} / 100</dd>
        </dl>
        <p className="mt-3 text-small text-ink-2">{nextLevelDownLine(level)}</p>
      </PopoverContent>
    </Popover>
  )
}

/** The global bar's chip; see useHeaderSupport for when it is absent. */
export function ScaffoldingChip({ inWorkspace }: { inWorkspace: boolean }) {
  const support = useHeaderSupport(inWorkspace)
  return support ? <ChipView assessment={support.assessment} basis={support.basis} /> : null
}
