import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

const OPTIONS: { label: string; value: AlgorithmMode }[] = [
  { label: 'Demo', value: AlgorithmMode.DEMO },
  { label: 'Practice', value: AlgorithmMode.PRACTICE },
]

export default function ModeToggle() {
  const mode = useAlgorithmStore((state) => state.mode)
  const setMode = useAlgorithmStore((state) => state.setMode)

  return (
    <div id="mode-toggle" className="relative inline-flex rounded-md bg-surface p-1">
      {OPTIONS.map((option) => {
        const isActive = mode === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={`relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="mode-toggle-indicator"
                className="absolute inset-0 -z-10 rounded-md bg-primary"
                transition={{ duration: 0.15 }}
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
