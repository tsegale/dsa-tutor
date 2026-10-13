import { useMutation } from '@tanstack/react-query'
import type { LearningPreferences } from '@dsa-tutor/types'
import { savePreferences } from '@/api/profile'
import { usePreferencesStore } from '@/store/usePreferencesStore'
import { useThemeStore } from '@/store/useThemeStore'
import { SOUND_ENABLED_KEY } from '@/hooks/useSoundEffects'

/** Apply a changed preference on this device straight away. */
export function applyLocally(patch: Partial<LearningPreferences>) {
  if (patch.theme === 'LIGHT') useThemeStore.getState().setTheme('light')
  if (patch.theme === 'DARK') useThemeStore.getState().setTheme('dark')
  if (patch.theme === 'SYSTEM') useThemeStore.getState().followSystem()
  if (patch.sound !== undefined) {
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(patch.sound))
    } catch {
      // Blocked storage: sounds keep their current setting for this visit.
    }
  }
}

/**
 * Change preferences (Phase 6D): applied at once, then saved on the server.
 * An active participant's preferences are not saved (the server refuses
 * them): their theme and sound stay local to the device, as before.
 */
export function useSavePreferences() {
  return useMutation({
    mutationFn: async (patch: Partial<LearningPreferences>) => {
      const { saved, participant, setSaved } = usePreferencesStore.getState()
      const next = { ...saved, ...patch }
      setSaved(next)
      applyLocally(patch)
      if (participant) return next
      try {
        return await savePreferences(next)
      } catch (err) {
        setSaved(saved)
        throw err
      }
    },
  })
}
