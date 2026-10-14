import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Long enough to coalesce a burst of answers into one topics refetch.
const REFRESH_DELAY_MS = 2500

/**
 * Refetches the topic list (which carries each topic's mastery) a moment
 * after an answer, explanation or challenge result is stored, so the mastery
 * panel and rail catch up without a refetch per answer.
 */
export function useMasteryRefresh(): () => void {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void queryClient.invalidateQueries({ queryKey: ['topics'] })
    }, REFRESH_DELAY_MS)
  }, [queryClient])
}
