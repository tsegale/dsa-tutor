import { useCallback, useEffect, useState } from 'react'
import { readExpanded, writeExpanded } from '@/utils/syllabus'
import { browserStorage } from '@/utils/lastPosition'

/**
 * Which modules are open, remembered per user in localStorage (Phase 5B).
 * Until the user toggles one, exactly the default module is open. Storage
 * can be blocked: the guarded helpers fall back to the default, and toggling
 * still works for the visit.
 */
export function useExpandedModules(storageKey: string, defaultId: string | null): { expanded: Set<string>; toggle: (id: string) => void } {
  const [stored, setStored] = useState<string[] | null>(() => readExpanded(browserStorage(), storageKey))
  useEffect(() => setStored(readExpanded(browserStorage(), storageKey)), [storageKey])

  const expanded = new Set(stored ?? (defaultId ? [defaultId] : []))
  const toggle = useCallback(
    (id: string) => {
      const next = new Set(stored ?? (defaultId ? [defaultId] : []))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const ids = [...next]
      setStored(ids)
      writeExpanded(browserStorage(), storageKey, ids)
    },
    [stored, defaultId, storageKey]
  )
  return { expanded, toggle }
}
