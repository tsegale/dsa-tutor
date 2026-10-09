import * as React from "react"
import { motion } from "framer-motion"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Progress is brand ("indigo = progress" in CLAUDE.md); success marks a
// finished or mastered value. Both take value as 0-100 and an optional
// label; the number is mono with tabular figures (mono is data).
export type ProgressTone = "brand" | "success"

const BAR_TONES: Record<ProgressTone, string> = { brand: "bg-brand", success: "bg-success" }
const RING_TONES: Record<ProgressTone, string> = { brand: "stroke-brand", success: "stroke-success" }

const clamp = (value: number) => Math.min(100, Math.max(0, value))

function Progress({
  className,
  value,
  label,
  showValue = Boolean(label),
  tone = "brand",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  label?: React.ReactNode
  showValue?: boolean
  tone?: ProgressTone
}) {
  const percent = clamp(value ?? 0)
  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 rounded-full transition-transform duration-settle", BAR_TONES[tone])}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  )

  if (!label && !showValue) return bar

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        {label && <span className="text-micro text-ink-2">{label}</span>}
        {showValue && <span className="ml-auto text-mono-sm text-ink">{Math.round(percent)}%</span>}
      </div>
      {bar}
    </div>
  )
}

function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  label,
  ariaLabel,
  showValue = true,
  showPercentSign = true,
  tone = "brand",
  className,
}: {
  value: number
  size?: number
  strokeWidth?: number
  /** Caption under the ring, also its accessible name. */
  label?: string
  /** Accessible name when there is no visible caption. */
  ariaLabel?: string
  showValue?: boolean
  showPercentSign?: boolean
  tone?: ProgressTone
  className?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const percent = clamp(value)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)
  const rounded = Math.round(percent)
  // The centre number scales with the ring; below ~40px it would not fit
  // a three-digit percentage, so it drops the sign first.
  const fontSize = Math.max(9, Math.floor(size * 0.24))

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-label={label ?? ariaLabel}
      className={cn("inline-flex flex-col items-center gap-1", className)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-surface-sunk" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
            className={RING_TONES[tone]}
          />
        </g>
        {showValue && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            className="fill-ink font-mono font-medium select-none"
          >
            {rounded}
            {showPercentSign && size >= 40 ? "%" : ""}
          </text>
        )}
      </svg>
      {label && <span className="text-micro text-ink-2">{label}</span>}
    </div>
  )
}

export { Progress, ProgressRing }
