import { getToken } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type ResearchExportKind = 'interactions' | 'assessments' | 'sessions' | 'misconceptions'

const EXPORT_PATHS: Record<ResearchExportKind, string> = {
  interactions: '/api/v1/research/interactions.csv',
  assessments: '/api/v1/research/assessments.csv',
  sessions: '/api/v1/research/sessions.csv',
  misconceptions: '/api/v1/research/misconceptions.csv',
}

// Export responses are raw CSV (Content-Type: text/csv), not the { data,
// error } JSON envelope apiFetch expects, so this bypasses it and talks to
// fetch directly.
export async function downloadResearchExport(kind: ResearchExportKind, includePilot: boolean): Promise<void> {
  const token = getToken()
  const path = `${EXPORT_PATHS[kind]}${includePilot ? '?includePilot=true' : ''}`
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(`Failed to export ${kind}`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${kind}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
