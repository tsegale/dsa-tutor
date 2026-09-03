import { motion } from 'framer-motion'

interface MasteryRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  /** Whether the centre label shows a trailing "%". Defaults to true;
   * a caller with its own "Progress" column header (e.g. a table) can
   * pass false since the context already makes the unit clear. */
  showPercent?: boolean
}

// The spec's "amber #EAB308 (gold)" is Tailwind's built-in yellow-500 —
// using the default-palette utility instead of an arbitrary hex value.
function getProgressColorClass(progress: number): string {
  if (progress >= 0.8) return 'stroke-yellow-500'
  if (progress >= 0.5) return 'stroke-active'
  return 'stroke-primary'
}

export default function MasteryRing({ progress, size = 48, strokeWidth = 4, showPercent = true }: MasteryRingProps) {
  const clamped = Math.min(1, Math.max(0, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - clamped)
  const percent = Math.round(clamped * 100)

  const fontSize = Math.max(8, Math.floor(size * 0.22))

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className="stroke-border"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            className={getProgressColorClass(clamped)}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        </g>
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          className="fill-text-primary font-semibold select-none"
        >
          {showPercent ? `${percent}%` : percent}
        </text>
      </svg>
    </div>
  )
}
