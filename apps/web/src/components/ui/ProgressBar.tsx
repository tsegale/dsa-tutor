import { motion } from 'framer-motion'
import { useAlgorithmStore, selectProgressPercent } from '@/store/useAlgorithmStore'

interface ProgressBarProps {
  // When omitted, falls back to the algorithm store's step progress
  // (this component's original behavior, used by the in-algorithm TopBar).
  percent?: number
  // 0-49% indigo, 50-79% amber, 80-100% green.
  colorCoded?: boolean
  // Animate width changes with a transition. Defaults to true, which is
  // correct for the in-algorithm TopBar's step progress (a live value that
  // genuinely advances while mounted). A caller whose value only ever
  // changes because of a fresh data fetch (e.g. the dashboard's per-track
  // mastery, set once per query response) should pass false - animating
  // between two fetched values can be caught mid-transition by a screenshot
  // or a fast re-render, showing a partially filled bar next to a label
  // that already reflects the new value.
  animate?: boolean
}

function getColorClass(percent: number, colorCoded: boolean): string {
  if (!colorCoded) return 'bg-primary'
  if (percent >= 80) return 'bg-success'
  if (percent >= 50) return 'bg-secondary'
  return 'bg-primary'
}

export default function ProgressBar({ percent, colorCoded = false, animate = true }: ProgressBarProps) {
  const storePercent = useAlgorithmStore(selectProgressPercent)
  const value = percent ?? storePercent
  const colorClass = getColorClass(value, colorCoded)

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      {animate ? (
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      ) : (
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
      )}
    </div>
  )
}
