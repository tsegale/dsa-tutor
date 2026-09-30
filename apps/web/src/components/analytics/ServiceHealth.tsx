import { useQuery } from '@tanstack/react-query'
import { getOpsReport, type OpsReport } from '@/api/research'
import { cn } from '@/lib/utils'

// Operational health (Week 4 4D.4): is everything reachable, how fast is the
// AI layer, is prompt caching working, and how often did a wrong answer get
// fallback feedback instead of the model's. Counts only.

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

function Reach({ label, value }: { label: string; value: OpsReport['database'] }) {
  const ok = value === 'ok'
  return (
    <span className={cn('flex items-center gap-1 text-sm font-medium', ok ? 'text-success' : 'text-error')}>
      {ok ? <CheckIcon /> : <XIcon />}
      {label} {ok ? 'reachable' : 'unreachable'}
    </span>
  )
}

const percent = (value: number | null) => (value === null ? '-' : `${Math.round(value * 100)}%`)
const ms = (value: number | null) => (value === null ? '-' : `${value.toLocaleString()} ms`)

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-text-primary">{value}</p>
      {note && <p className="text-[11px] text-text-muted">{note}</p>}
    </div>
  )
}

export default function ServiceHealth() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['research-ops'], queryFn: getOpsReport, refetchInterval: 60000 })

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">Service health</span>
        <p className="mt-1 text-xs text-text-muted">AI counters are per AI-service instance and reset on each deploy.</p>
      </div>
      {isLoading && <p className="px-4 py-3 text-sm text-text-muted">Checking...</p>}
      {isError && <p className="px-4 py-3 text-sm text-error">Could not load service health.</p>}
      {data && (
        <div className="flex flex-col gap-4 px-4 py-3">
          <div className="flex flex-wrap gap-4">
            <Reach label="Database" value={data.database} />
            <Reach label="AI service" value={data.aiService} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="AI calls" value={data.ai ? data.ai.calls.toLocaleString() : '-'} note={data.ai ? `since ${new Date(data.ai.since).toLocaleString()}` : undefined} />
            <Stat label="Latency p50" value={ms(data.ai?.latencyMsP50 ?? null)} />
            <Stat label="Latency p95" value={ms(data.ai?.latencyMsP95 ?? null)} />
            <Stat label="Cache hit rate" value={percent(data.ai?.cacheHitRate ?? null)} note="calls that read the cached prompt" />
            <Stat
              label="Wrong-answer fallback rate"
              value={percent(data.fallback.rate)}
              note={`${data.fallback.fallbacks} of ${data.fallback.wrongAnswersWithFeedback}, last ${data.fallback.windowDays} days`}
            />
          </div>
          {data.fallback.byReason.length > 0 && (
            <p className="text-xs text-text-muted">
              Fallback reasons: {data.fallback.byReason.map((r) => `${r.reason} (${r.count})`).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
