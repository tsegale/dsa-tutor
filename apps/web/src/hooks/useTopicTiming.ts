import { useEffect } from 'react'
import { apiFetch } from '@/api/client'
import { TIMING_HEARTBEAT_MS } from '@/config/pacing'
import { createTopicTimer } from '@/utils/topicTimer'

/**
 * Writes this topic session's wall-clock and active seconds to the session
 * row (Week 2 2F): every TIMING_HEARTBEAT_MS, whenever the page is hidden
 * (keepalive, so it survives the tab closing), and when the page unmounts.
 * Reporting only - nothing here changes the session.
 */
export function useTopicTiming(sessionId: string | null): void {
  useEffect(() => {
    if (!sessionId) return
    const timer = createTopicTimer(Date.now(), document.visibilityState === 'visible')

    function write(keepalive = false) {
      apiFetch(`/api/v1/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify(timer.read(Date.now())),
        keepalive,
      }).catch(() => {
        // Telemetry is best-effort; the next heartbeat carries the full
        // cumulative totals, so one lost write loses nothing.
      })
    }

    function handleVisibility() {
      const visible = document.visibilityState === 'visible'
      timer.setVisible(visible, Date.now())
      if (!visible) write(true)
    }

    const interval = setInterval(() => write(), TIMING_HEARTBEAT_MS)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      write(true)
    }
  }, [sessionId])
}
