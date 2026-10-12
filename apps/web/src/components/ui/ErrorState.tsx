import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// A load failed. Say what failed, what to do, and offer a retry. Use this
// instead of rendering whatever partial data arrived: the dashboard once
// showed a three-topic curriculum with no sign the request had failed.
// Error styling per CLAUDE.md: red, an X icon and a stripe, never hue alone.
function ErrorState({
  title,
  description,
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  className,
}: {
  /** What failed, e.g. "The curriculum did not load." */
  title: React.ReactNode
  /** What to do, e.g. "Check your connection, then try again." */
  description?: React.ReactNode
  onRetry?: () => void
  /** Shows the retry button's spinner while a refetch is in flight. */
  retrying?: boolean
  retryLabel?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn("flex items-start gap-3 overflow-hidden rounded-md border border-destructive/40 bg-error-light pr-4", className)}
    >
      <div className="bg-error-stripes w-2 self-stretch bg-destructive/20" aria-hidden="true" />
      <svg className="mt-4 size-5 shrink-0 text-destructive" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="m7 7 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-4">
        <p className="text-small font-semibold text-ink">{title}</p>
        {description && <p className="max-w-prose text-small text-ink-2">{description}</p>}
        {onRetry && (
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export { ErrorState }
