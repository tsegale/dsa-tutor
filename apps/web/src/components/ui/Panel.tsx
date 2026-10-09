import * as React from "react"

import { cn } from "@/lib/utils"

type PanelProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** Heading row: a short name for the rail's content. */
  title?: React.ReactNode
  /** Controls at the end of the heading row (IconButtons, a Pill). */
  actions?: React.ReactNode
  /** Which edge meets the workspace and gets the rule. */
  edge?: "left" | "right" | "none"
}

/**
 * Full-height container on --surface for the workspace rails. The body
 * scrolls on its own so the heading row stays put.
 */
function Panel({ title, actions, edge = "none", className, children, ...props }: PanelProps) {
  return (
    <section
      data-slot="panel"
      className={cn(
        "flex h-full min-h-0 flex-col bg-surface text-ink",
        edge === "left" && "border-l border-rule",
        edge === "right" && "border-r border-rule",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-rule px-panel py-2">
          {title && <h2 className="text-small font-semibold text-ink">{title}</h2>}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-panel">{children}</div>
    </section>
  )
}

export { Panel }
