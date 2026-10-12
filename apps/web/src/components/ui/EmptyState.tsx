import * as React from "react"

import { cn } from "@/lib/utils"

// Something is missing and the learner can fix it. One line naming what is
// missing, phrased as an invitation ("No sessions yet. Start one from the
// curriculum."), never an apology, and one action.
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  /** The one line naming what is missing. */
  title: React.ReactNode
  description?: React.ReactNode
  /** A single control, usually a Button. */
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center gap-3 rounded-md border border-dashed border-rule-strong px-6 py-10 text-center", className)}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-sunk text-ink-2 [&_svg]:size-5" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-body font-medium text-ink">{title}</p>
        {description && <p className="text-small text-ink-2">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
