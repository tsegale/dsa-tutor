import { AnimatePresence, motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

const PSEUDOCODE_LINES = [
  'for i from 0 to n-1 do',
  '  for j from 0 to n-i-2 do',
  '    if arr[j] > arr[j+1] then',
  '      swap arr[j] and arr[j+1]',
  '  end for',
  'end for',
  'array is sorted',
]

function ComingSoonLabel({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-not-allowed text-text-muted dark:text-dark-text-secondary">{label}</span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  )
}

export default function PseudocodePanel() {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const activeLine = snapshot?.pseudocodeLine

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-white dark:bg-dark-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Pseudocode</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-primary">Pseudocode</span>
          <span className="text-text-muted dark:text-dark-text-secondary">|</span>
          <ComingSoonLabel label="Python" />
          <span className="text-text-muted dark:text-dark-text-secondary">|</span>
          <ComingSoonLabel label="Java" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-sm">
        {PSEUDOCODE_LINES.map((line, index) => {
          const isActive = index === activeLine
          return (
            <div key={index} className="relative px-3 py-1">
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 border-l-4 border-primary bg-primary/10"
                  />
                )}
              </AnimatePresence>
              <span
                className={cn(
                  'relative whitespace-pre',
                  isActive
                    ? 'font-bold text-text-primary dark:text-dark-text-primary'
                    : 'text-text-muted dark:text-dark-text-secondary',
                )}
              >
                {line}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
