import { cn } from '@/lib/utils'

function FitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Restores a zoomed tree or graph canvas to its fitted view. Hidden at fit, where it would do nothing. */
export default function FitToViewButton({ zoomed, onFit, className }: { zoomed: boolean; onFit: () => void; className?: string }) {
  if (!zoomed) return null
  return (
    <button
      type="button"
      onClick={onFit}
      aria-label="Fit to view"
      className={cn(
        'absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-text-secondary shadow-sm hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border',
        className,
      )}
    >
      <FitIcon />
      Fit to view
    </button>
  )
}
