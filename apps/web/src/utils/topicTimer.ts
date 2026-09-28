/**
 * Wall-clock and active (tab visible) time for one topic session (Week 2
 * 2F). Pure: every method takes the current time, so it is testable without
 * fake timers and the caller owns the clock.
 */
export interface TopicTiming {
  wallClockSeconds: number
  activeSeconds: number
}

export interface TopicTimer {
  setVisible: (visible: boolean, now: number) => void
  read: (now: number) => TopicTiming
}

export function createTopicTimer(startedAt: number, visible: boolean): TopicTimer {
  let activeMs = 0
  // When the current visible stretch began, or null while hidden.
  let visibleSince: number | null = visible ? startedAt : null

  return {
    setVisible(nextVisible, now) {
      if (nextVisible && visibleSince === null) visibleSince = now
      if (!nextVisible && visibleSince !== null) {
        activeMs += Math.max(0, now - visibleSince)
        visibleSince = null
      }
    },
    read(now) {
      const active = activeMs + (visibleSince !== null ? Math.max(0, now - visibleSince) : 0)
      return {
        wallClockSeconds: Math.max(0, Math.round((now - startedAt) / 1000)),
        activeSeconds: Math.round(active / 1000),
      }
    },
  }
}
