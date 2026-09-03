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
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-white dark:bg-dark-surface"
      style={{ width: '100%' }}
    >
      <div className="border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Pseudocode</span>
      </div>
      <div
        className="flex items-center gap-3 px-4 py-1.5 text-[11px]"
        style={{ borderBottom: '0.5px solid var(--border)' }}
      >
        <span className="font-medium text-primary">Pseudocode</span>
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Python" />
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Java" />
      </div>
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-2 font-mono">
        {PSEUDOCODE_LINES.map((line, index) => {
          const isActive = index === activeLine
          return (
            <div key={index} className="relative flex py-1" style={{ lineHeight: 1.7 }}>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 border-l-[3px] border-[#378add] bg-[rgba(55,138,221,0.1)]"
                  />
                )}
              </AnimatePresence>
              <span className="relative w-5 shrink-0 pl-2 text-right text-[10px] text-text-muted select-none">
                {index + 1}
              </span>
              <span
                className={cn(
                  'relative min-w-0 flex-1 pl-2 text-[11px]',
                  isActive ? 'font-medium text-text-accent' : 'font-normal text-text-primary dark:text-dark-text-primary',
                )}
                style={
                  isActive
                    ? { whiteSpace: 'nowrap', overflow: 'visible' }
                    : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                }
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
