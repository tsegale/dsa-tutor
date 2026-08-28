import { motion } from 'framer-motion'
import { useAlgorithmStore, selectProgressPercent } from '@/store/useAlgorithmStore'

interface ProgressBarProps {
  // When omitted, falls back to the algorithm store's step progress
  // (this component's original behavior, used by the in-algorithm TopBar).
  percent?: number
  // 0-49% indigo, 50-79% amber, 80-100% green.
  colorCoded?: boolean
}

function getColorClass(percent: number, colorCoded: boolean): string {
  if (!colorCoded) return 'bg-primary'
  if (percent >= 80) return 'bg-success'
  if (percent >= 50) return 'bg-secondary'
  return 'bg-primary'
}

export default function ProgressBar({ percent, colorCoded = false }: ProgressBarProps) {
  const storePercent = useAlgorithmStore(selectProgressPercent)
  const value = percent ?? storePercent

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <motion.div
        className={`h-full rounded-full ${getColorClass(value, colorCoded)}`}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}
