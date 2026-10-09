import * as React from "react"

import { cn } from "@/lib/utils"

// Status chips (difficulty, track, mastery band). Tinted background, no
// border. Each tone is a bg/fg pair from index.css chosen for 4.5:1 in both
// themes. ai is cyan and belongs to AI surfaces only (CLAUDE.md accents).
const TONES = {
  neutral: "bg-[var(--tone-slate-bg)] text-[var(--tone-slate-fg)]",
  brand: "bg-brand-soft text-accent-foreground",
  success: "bg-[var(--tone-green-bg)] text-[var(--tone-green-fg)]",
  warning: "bg-[var(--tone-amber-bg)] text-[var(--tone-amber-fg)]",
  danger: "bg-[var(--tone-red-bg)] text-[var(--tone-red-fg)]",
  ai: "bg-ai-light text-ai-foreground",
} as const

export type PillTone = keyof typeof TONES

function Pill({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: PillTone; icon?: React.ReactNode }) {
  return (
    <span
      data-slot="pill"
      data-tone={tone}
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-micro whitespace-nowrap tabular-nums [&_svg]:size-3 [&_svg]:shrink-0",
        TONES[tone],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}

export { Pill }
