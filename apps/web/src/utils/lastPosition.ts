// Where the learner stopped in a run, recorded by the workspace and read by
// Home's next-step banner ("step 24 of 52"). The server records no step
// position, so this lives in localStorage, per user, on this device. Storage
// can be blocked or cleared: every access is guarded, and Home simply omits
// the step line without it.

export interface LastPosition {
  /** Topic slug. */
  topic: string
  /** 1-based step the learner was on. */
  step: number
  /** Steps in that run. */
  total: number
  /** ISO time of the last step change. */
  at: string
}

/** window.localStorage, or undefined where reading it throws (blocked storage). */
export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    // Blocked: callers treat undefined as "nothing recorded".
    return undefined
  }
}

export const lastPositionKey = (userId: string) => `dsa-tutor-last-position:${userId}`

export function readLastPosition(storage: Pick<Storage, 'getItem'> | undefined, userId: string | null | undefined): LastPosition | null {
  if (!userId) return null
  try {
    const raw = storage?.getItem(lastPositionKey(userId))
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { topic, step, total, at } = value as Record<string, unknown>
    if (typeof topic !== 'string' || typeof step !== 'number' || typeof total !== 'number' || typeof at !== 'string') return null
    if (total < 1 || step < 1 || step > total || Number.isNaN(Date.parse(at))) return null
    return { topic, step, total, at }
  } catch {
    // Unreadable or blocked storage: no step line.
    return null
  }
}

export function writeLastPosition(storage: Pick<Storage, 'setItem'> | undefined, userId: string | null | undefined, position: LastPosition): void {
  if (!userId) return
  try {
    storage?.setItem(lastPositionKey(userId), JSON.stringify(position))
  } catch {
    // Blocked storage: Home falls back to the session's own data.
  }
}
