import { cn } from '@/lib/utils'
import { AppTopBar } from '@/components/layout/AppShell'
import { ContextBar } from '@/components/layout/ContextBar'

interface AnalyticsNavProps {
  refetch: () => void
  isFetching: boolean
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn(spinning && 'animate-spin')}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The educator dashboard's header: the same global bar as every learner page
 * (so the role switcher can flip back to Student view), with the dashboard's
 * own title and refresh in its context bar.
 */
export default function AnalyticsNav({ refetch, isFetching }: AnalyticsNavProps) {
  return (
    <AppTopBar
      context={
        <ContextBar
          label="Educator dashboard"
          start={<p className="text-small font-medium text-ink">Educator dashboard</p>}
          end={
            <>
              <span className="text-micro text-ink-2">Last updated: just now</span>
              <button
                type="button"
                onClick={() => refetch()}
                aria-label="Refresh analytics"
                className="flex size-8 items-center justify-center rounded-sm text-ink-2 transition-colors duration-quick hover:bg-surface-sunk hover:text-ink"
              >
                <RefreshIcon spinning={isFetching} />
              </button>
            </>
          }
        />
      }
    />
  )
}
