import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_KEY = 'dsa-tutor-chunk-reload-at'
// A second failure this soon after a reload is not a stale deploy - it is
// a real outage - so surface it instead of reloading in a loop.
const RELOAD_WINDOW_MS = 10_000

/**
 * Reloads the page once when a code-split chunk this tab was built against
 * no longer exists, which happens when a deploy lands while someone is
 * mid-session: their old index asks for a chunk the new deploy replaced,
 * and the page would otherwise go blank. Returns false (no reload) when a
 * reload was already tried within the window, so the error surfaces.
 */
export function reloadOnceForStaleChunk(now: number = Date.now(), reload: () => void = () => window.location.reload()): boolean {
  let lastReload = 0
  try {
    lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
  } catch {
    // Storage blocked: fall through and allow the single reload.
  }
  if (now - lastReload < RELOAD_WINDOW_MS) return false
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    // Without storage the window guard cannot persist; a reload loop is
    // still bounded by the browser, and this is the rare path.
  }
  reload()
  return true
}

/**
 * Whether a failed dynamic import was one of this app's own chunks (worth a
 * reload after a deploy) rather than a third-party URL such as a CDN.
 * The failure message names the URL; a relative or same-origin one is ours.
 */
export function isOwnChunkFailure(message: string, origin: string): boolean {
  const url = message.match(/https?:\/\/\S+/)?.[0]
  return !url || url.startsWith(origin)
}

/**
 * React.lazy that recovers from a stale chunk by reloading once. Use for
 * every route-level code-split import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy's own signature requires ComponentType<any>; props are checked at each use site.
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (reloadOnceForStaleChunk()) return new Promise<never>(() => {}) // the page is reloading
      throw err
    }
  })
}
