import { ProgressRing } from '@/components/ui/progress'
import { TOPIC_COMPLETE } from '@/config/curriculum'

interface MasteryRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  /** Whether the centre label shows a trailing "%". Defaults to true;
   * a caller with its own "Progress" column header (e.g. a table) can
   * pass false since the context already makes the unit clear. */
  showPercent?: boolean
}

// The mastery ring, on the shared ProgressRing. Two bands: brand while
// learning, success once the topic reaches the curriculum threshold.
// The old middle band was violet, the canvas "active" colour, and gold
// added a third accent with no meaning of its own.
export default function MasteryRing({ progress, size = 48, strokeWidth = 4, showPercent = true }: MasteryRingProps) {
  const percent = Math.min(1, Math.max(0, progress)) * 100
  return (
    <ProgressRing
      value={percent}
      size={size}
      strokeWidth={strokeWidth}
      showPercentSign={showPercent}
      tone={percent >= TOPIC_COMPLETE ? 'success' : 'brand'}
      ariaLabel="Mastery"
    />
  )
}
