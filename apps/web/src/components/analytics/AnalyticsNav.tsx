import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DSATutorLogo } from '@/components/brand'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface AnalyticsNavProps {
  refetch: () => void
  isFetching: boolean
}

function BackArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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

export default function AnalyticsNav({ refetch, isFetching }: AnalyticsNavProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <DSATutorLogo variant="dark" showTagline={false} />
        <div className="h-6 w-[0.5px] bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Back to dashboard"
          className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface"
        >
          <BackArrowIcon />
        </button>
        <span className="text-[14px] font-medium text-text-primary">Educator dashboard</span>
        <span
          className="rounded-[10px] px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: '#eef2ff', color: '#3730a3', border: '0.5px solid #c7d2fe' }}
        >
          Educator
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[11px] text-text-muted">Last updated: just now</span>
        <button
          type="button"
          onClick={() => refetch()}
          aria-label="Refresh analytics"
          className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface"
        >
          <RefreshIcon spinning={isFetching} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
