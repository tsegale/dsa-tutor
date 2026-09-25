/**
 * One structured operational log line (JSON) on stdout, where Railway
 * collects it. Deliberately not console.log: these are machine-joinable
 * events (e.g. by requestId against the AI service's logs), not debugging.
 */
export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...fields })}\n`)
}
