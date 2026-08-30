import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ExplanationPanel from '@/components/canvas/ExplanationPanel'
import PseudocodePanel from '@/components/canvas/PseudocodePanel'
import ComplexityPanel from '@/components/canvas/ComplexityPanel'

interface RightPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeTab: number
  onTabChange: (tab: number) => void
}

const EXPANDED_WIDTH = 320
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

export default function RightPanel({ collapsed, onToggle, activeTab, onTabChange }: RightPanelProps) {
  function expandToTab(tab: number) {
    if (collapsed) onToggle()
    onTabChange(tab)
  }

  return (
    <motion.div
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex h-full flex-col overflow-hidden border-l border-border bg-white dark:bg-dark-surface"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(1)}
                aria-label="Explanation"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <ExplanationIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Explanation</TooltipContent>
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
        <div className="flex h-full flex-col overflow-hidden p-3">
          <Tabs
            value={String(activeTab)}
            onValueChange={(value) => onTabChange(Number(value))}
            className="flex h-full flex-col overflow-hidden"
          >
            <TabsList>
              <TabsTrigger value="1">Explanation</TabsTrigger>
              <TabsTrigger value="2">Pseudocode</TabsTrigger>
              <TabsTrigger value="3">Complexity</TabsTrigger>
            </TabsList>
            <TabsContent value="1" className="flex-1 overflow-y-auto">
              <ExplanationPanel />
            </TabsContent>
            <TabsContent value="2" className="flex-1 overflow-y-auto">
              <PseudocodePanel />
            </TabsContent>
            <TabsContent value="3" className="flex-1 overflow-y-auto">
              <ComplexityPanel />
            </TabsContent>
          </Tabs>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse panel"
            className="mt-2 flex items-center justify-center self-end text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
          >
            <ChevronIcon pointRight />
          </button>
        </div>
      )}
    </motion.div>
  )
}
