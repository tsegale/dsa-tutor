import * as React from "react"

import { cn } from "@/lib/utils"

// Loading placeholders shaped like what is coming, so the page does not
// jump when it arrives. The shimmer (index.css) stops under reduced motion.
// Hidden from assistive tech: the region that is loading should carry
// aria-busy instead.

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("skeleton-shimmer rounded-sm", className)} {...props} />
}

/** Lines of body text; the last line is shorter, as real paragraphs are. */
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  )
}

/** Card-shaped: title, two lines, footer row. Matches Card's padding. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-md border border-rule bg-card p-card", className)} aria-hidden="true">
      <Skeleton className="h-5 w-2/5" />
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
    </div>
  )
}

/** Canvas-shaped: bars of varied height on a baseline, like an array view. */
const CANVAS_BARS = ['h-[55%]', 'h-[80%]', 'h-[35%]', 'h-[65%]', 'h-[45%]', 'h-[90%]', 'h-[25%]', 'h-[70%]']

function SkeletonCanvas({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-full min-h-48 items-end justify-center gap-3 rounded-md border border-rule bg-card p-panel", className)}
      aria-hidden="true"
    >
      {CANVAS_BARS.map((height, i) => (
        <Skeleton key={i} className={cn("w-8 rounded-sm", height)} />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonCanvas }
