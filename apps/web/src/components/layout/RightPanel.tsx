import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import PseudocodePanel from '@/components/canvas/PseudocodePanel'
import ComplexityPanel from '@/components/canvas/ComplexityPanel'
import StepLog from './StepLog'
import ScaffoldingFader from './ScaffoldingFader'
import MistakeAnalysisToast from '@/components/prediction/MistakeAnalysisToast'
import { cn } from '@/lib/utils'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'

interface RightPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeTab: number
  onTabChange: (tab: number) => void
  mistakeAnalysis: string | null
  mistakeHint: string | null
  mistakeCounterfactual: string | null
  onDismissMistake: () => void
  hint: string | null
  /** False while the current step's prediction is still pending (or has
   * been answered wrong but not yet revealed) - the Socratic guidance box
   * must show the answer-safe junction prompt, not the snapshot's own
   * narration description, until this is true. */
  predictionResolved: boolean
  /** Compact-layout tab mode (<1024px): renders full width, always expanded,
   * with no rail/collapse toggle - there's no room for a docked rail once
   * the panel is a full-screen tab instead of a sidebar. */
  fullWidth?: boolean
}

const EXPANDED_WIDTH = 280
const COLLAPSED_WIDTH = 48

function ExplanationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

function PseudocodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 4 3 12l5 8M16 4l5 8-5 8" />
    </svg>
  )
}

function ComplexityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

function StepLogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ pointRight }: { pointRight: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={pointRight ? '' : 'rotate-180'}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function SocraticGuidanceBox({ hint, predictionResolved }: { hint: string | null; predictionResolved: boolean }) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const correct = useAlgorithmStore((state) => state.sessionCorrectPredictions)
  const total = useAlgorithmStore((state) => state.sessionTotalPredictions)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // Never show the snapshot's own narration description while a prediction
  // is pending - several engines' descriptions state the outcome of the
  // junction, which would hand the student the answer to the question
  // they're being asked. getPromptForSnapshot is answer-safe.
  const guidanceText = !snapshot
    ? 'Load an algorithm to begin.'
    : snapshot.isPredictionRequired && !predictionResolved
      ? getPromptForSnapshot(snapshot, algorithmName)
      : snapshot.description

  return (
    <div className="rounded-md border border-border bg-white p-3 dark:bg-dark-surface">
      <p className="text-xs font-bold text-primary">Socratic guidance</p>
      <p className="mt-1.5 text-xs text-text-primary italic dark:text-dark-text-primary">{guidanceText}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-text-muted dark:text-dark-text-secondary">
          {total > 0 ? `${correct}/${total} correct (${accuracy}%)` : 'No predictions yet'}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} />
        </div>
      </div>

      {hint && (
        <div className="mt-3 rounded-md border-l-4 border-secondary bg-secondary-light p-2.5">
          <p className="text-[13px] text-secondary italic">{hint}</p>
        </div>
      )}
    </div>
  )
}

export default function RightPanel({
  collapsed,
  onToggle,
  activeTab,
  onTabChange,
  mistakeAnalysis,
  mistakeHint,
  mistakeCounterfactual,
  onDismissMistake,
  hint,
  predictionResolved,
  fullWidth = false,
}: RightPanelProps) {
  const pseudocodeLine = useAlgorithmStore((state) => selectCurrentSnapshot(state)?.pseudocodeLine ?? null)

  function expandToTab(tab: number) {
    if (collapsed) onToggle()
    onTabChange(tab)
  }

  return (
    <motion.div
      animate={fullWidth ? undefined : { width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'flex h-full flex-col overflow-hidden border-l border-border bg-white dark:bg-dark-surface',
        fullWidth && 'w-full',
      )}
      style={{ overflowX: 'hidden' }}
    >
      {!fullWidth && collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(1)}
                aria-label="AI Tutor"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <ExplanationIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">AI Tutor</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(2)}
                aria-label="Pseudocode"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <PseudocodeIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Pseudocode</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(3)}
                aria-label="Complexity"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <ComplexityIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Complexity</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(4)}
                aria-label="Step log"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <StepLogIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Step log</TooltipContent>
          </Tooltip>

          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand panel"
            className="mt-auto flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface"
          >
            <ChevronIcon pointRight={false} />
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden px-3 py-2.5">
          <Tabs
            value={String(activeTab)}
            onValueChange={(value) => onTabChange(Number(value))}
            className="flex h-full flex-col overflow-hidden"
          >
            <TabsList>
              <TabsTrigger value="1" className="px-[10px] py-2 text-[12px] tracking-normal">
                AI Tutor
              </TabsTrigger>
              <TabsTrigger value="2" className="px-[10px] py-2 text-[12px] tracking-normal">
                Pseudocode
              </TabsTrigger>
              <TabsTrigger value="3" className="px-[10px] py-2 text-[12px] tracking-normal">
                Complexity
              </TabsTrigger>
              <TabsTrigger value="4" className="px-[10px] py-2 text-[12px] tracking-normal">
                Step log
              </TabsTrigger>
            </TabsList>
            <TabsContent value="1" className="flex flex-1 flex-col gap-3 overflow-y-auto">
              <ScaffoldingFader />
              <MistakeAnalysisToast
                message={mistakeAnalysis}
                hint={mistakeHint}
                counterfactualTrace={mistakeCounterfactual}
                pseudocodeLine={pseudocodeLine}
                onDismiss={onDismissMistake}
              />
              <SocraticGuidanceBox hint={hint} predictionResolved={predictionResolved} />
            </TabsContent>
            <TabsContent value="2" className="flex-1 overflow-y-auto">
              <PseudocodePanel />
            </TabsContent>
            <TabsContent value="3" className="flex-1 overflow-y-auto">
              <ComplexityPanel />
            </TabsContent>
            <TabsContent value="4" className="flex-1 overflow-y-auto">
              <StepLog predictionResolved={predictionResolved} />
            </TabsContent>
          </Tabs>
          {!fullWidth && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse panel"
              className="mt-2 flex items-center justify-center self-end text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              <ChevronIcon pointRight />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
