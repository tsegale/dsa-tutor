import { useState } from 'react'
import { downloadResearchExport, type ResearchExportKind } from '@/api/research'

const EXPORTS: { kind: ResearchExportKind; label: string }[] = [
  { kind: 'interactions', label: 'Interactions' },
  { kind: 'assessments', label: 'Assessments' },
  { kind: 'sessions', label: 'Sessions' },
  { kind: 'misconceptions', label: 'Misconceptions' },
]

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ResearchExports() {
  const [includePilot, setIncludePilot] = useState(false)
  const [pending, setPending] = useState<ResearchExportKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(kind: ResearchExportKind) {
    setPending(kind)
    setError(null)
    try {
      await downloadResearchExport(kind, includePilot)
    } catch {
      setError(`Could not download the ${kind} export. Please try again.`)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="rounded-md border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">Research data</span>
        <p className="mt-1 text-xs text-text-muted">
          Exports contain participant codes only, never names or emails.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={includePilot}
            onChange={(event) => setIncludePilot(event.target.checked)}
            className="size-4 rounded border-border"
          />
          Include pilot participants
        </label>

        <div className="flex flex-wrap gap-2">
          {EXPORTS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => void handleDownload(kind)}
              disabled={pending !== null}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DownloadIcon />
              {pending === kind ? 'Downloading...' : label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="border-t border-border px-4 py-2 text-xs text-error">{error}</p>}
    </div>
  )
}
