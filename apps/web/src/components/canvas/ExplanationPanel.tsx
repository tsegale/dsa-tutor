import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Switch } from '@/components/ui/switch'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'

const SIMPLIFIED_EXPLANATION =
  'Think of it like sorting a hand of cards — keep swapping neighbours until the biggest ones bubble to the end.'

export default function ExplanationPanel() {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [simplified, setSimplified] = useState(false)

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary">Explanation</span>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          Simplified Mode
          <Switch checked={simplified} onCheckedChange={setSimplified} />
        </label>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence>
          <motion.p
            key={snapshot?.stepIndex ?? 'empty'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeIn' }}
            className="font-sans text-[15px] text-text-primary"
          >
            {snapshot?.description ?? 'Load an algorithm to begin.'}
          </motion.p>
        </AnimatePresence>
        {simplified && <p className="mt-3 text-sm text-text-muted">{SIMPLIFIED_EXPLANATION}</p>}
      </div>
    </div>
  )
}
