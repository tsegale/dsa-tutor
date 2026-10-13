import { cn } from '@/lib/utils'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { conditionFeatures } from '@/utils/studyCondition'
import { useTopics } from '@/hooks/useTopics'
import { SUPPORT_LEVEL, nextLevelDownLine } from '@/config/supportLevels'
import { overallSupport, type SupportAssessment } from '@/utils/supportBand'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// The scaffolding state, made visible in the global bar (Phase 4C). The chip
// names the level and opens a popover in which the mechanism explains
// itself: the level, the reasoning masteryScore.ts gave, the mastery score,
// and what changes at the next level down.
//
// The meter is --ink-2 on --rule-strong, deliberately neither brand (brand
// means interactive) nor a canvas state colour (those mean algorithm state).

function Meter({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-end gap-0.5', className)}>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={cn('h-3 w-1 rounded-[1px]', index < filled ? 'bg-ink-2' : 'bg-rule-strong')} />
      ))}
    </span>
  )
}

/** The live session level, as the workspace's fading logic last set it. */
function useSessionSupport(): SupportAssessment {
  const level = useAlgorithmStore((state) => state.scaffoldingLevel)
  const reasoning = useAlgorithmStore((state) => state.scaffoldingReasoning)
  const score = useAlgorithmStore((state) => state.scaffoldingScore)
  return { level, reasoning, score }
}

function useOverallSupport(): SupportAssessment | null {
  const { data: topics } = useTopics()
  return topics ? overallSupport(topics) : null
}

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
              <Meter filled={segments} />
              <span className="hidden font-medium text-ink xl:inline">{label}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="xl:hidden">Support level: {label}</TooltipContent>
      </Tooltip>
      <PopoverContent aria-label="Why this level of support">
        <p className="text-micro text-ink-2">{basis}</p>
        <div className="mt-2 flex items-center gap-2.5">
          <Meter filled={segments} className="[&>span]:h-4 [&>span]:w-1.5" />
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

const SESSION_BASIS = 'This session, from your answers so far'
const OVERALL_BASIS = 'Your overall band, from mastery across your topics'

/**
 * The support state the header shows, or null where it must not show: in
 * Classic, the study's control condition, whose participants must not see a
 * scaffolding indicator, and while the overall band's topics load. In the
 * workspace it is the live session level; elsewhere the overall band.
 */
export function useHeaderSupport(inWorkspace: boolean): { assessment: SupportAssessment; basis: string } | null {
  // The study condition's feature list decides, as it does for every other
  // tutor surface: Classic has no scaffolding indicator.
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  const session = useSessionSupport()
  const overall = useOverallSupport()
  if (inWorkspace) return features.scaffoldingPill ? { assessment: session, basis: SESSION_BASIS } : null
  return overall ? { assessment: overall, basis: OVERALL_BASIS } : null
}

/** The global bar's chip; see useHeaderSupport for when it is absent. */
export function ScaffoldingChip({ inWorkspace }: { inWorkspace: boolean }) {
  const support = useHeaderSupport(inWorkspace)
  return support ? <ChipView assessment={support.assessment} basis={support.basis} /> : null
}
