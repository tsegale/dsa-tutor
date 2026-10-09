import { ProgressRing } from '@/components/ui/progress'

interface MasteryRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  /** Whether the centre label shows a trailing "%". Defaults to true;
   * a caller with its own "Progress" column header (e.g. a table) can
   * pass false since the context already makes the unit clear. */
  showPercent?: boolean
}

// The dashboard's mastery ring, now the shared ProgressRing. Two bands
// instead of three: brand while learning, success once mastered (80%+).
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
      tone={percent >= 80 ? 'success' : 'brand'}
      ariaLabel="Mastery"
    />
  )
}
