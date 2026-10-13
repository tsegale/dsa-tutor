import type { ReactNode } from 'react'

/**
 * The header's second tier (Phase 4A): 40px, full width, under the global bar
 * and above the curriculum rail and canvas. The global bar's bottom rule is
 * the hairline between the tiers. Only pages with context render one: the
 * workspace and the module pages.
 */
export function ContextBar({
  label,
  start,
  center,
  end,
  progressPercent,
}: {
  /** Names the region for assistive technology, e.g. "Session". */
  label: string
  start: ReactNode
  center?: ReactNode
  end?: ReactNode
  /** A thin progress line along the bottom edge (the workspace's steps). */
  progressPercent?: number
}) {
  return (
    // Below 1024px the bar wraps to a second line rather than truncating the
    // breadcrumb or scrolling sideways (Phase 4G): the start keeps its
    // natural width and whatever no longer fits moves down a line.
    <div
      role="region"
      aria-label={label}
      className="relative flex min-h-10 w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule bg-surface px-4 py-0.5 md:px-6 lg:h-10 lg:flex-nowrap lg:py-0"
    >
      <div className="flex max-w-full min-w-0 shrink-0 grow items-center gap-3 lg:shrink lg:basis-0">{start}</div>
      {center && <div className="shrink-0">{center}</div>}
      {/* Equal flex on both sides keeps the centre centred from 1280px; below
          that the end sizes to its content so the breadcrumb keeps its room. */}
      {end && <div className="ml-auto flex shrink-0 items-center justify-end gap-2 xl:flex-1">{end}</div>}
      {progressPercent !== undefined && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-brand transition-[width] duration-settle" style={{ width: `${progressPercent}%` }} aria-hidden="true" />
      )}
    </div>
  )
}
