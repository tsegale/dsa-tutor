import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useStudyScope } from '@/hooks/useStudyScope'
import { usePreferencesStore } from '@/store/usePreferencesStore'
import { useThemeStore } from '@/store/useThemeStore'
import { SOUND_ENABLED_KEY } from '@/hooks/useSoundEffects'

/**
 * Applies the signed-in learner's saved preferences (Phase 6D) when they
 * load. Theme applies only when explicitly light or dark: "follow system"
 * leaves the device's own setting alone. An active participant's learning
 * settings are pinned to the defaults (usePreferencesStore selectors), and
 * their sound setting stays local to the device.
 */
export function PreferencesSync() {
  const { user } = useAuth()
  const { restricted } = useStudyScope()
  const preferences = user?.preferences

  useEffect(() => {
    usePreferencesStore.getState().setParticipant(restricted)
  }, [restricted])

  useEffect(() => {
    if (!preferences) return
    usePreferencesStore.getState().setSaved(preferences)
    if (preferences.theme === 'LIGHT') useThemeStore.getState().setTheme('light')
    if (preferences.theme === 'DARK') useThemeStore.getState().setTheme('dark')
    if (!restricted) {
      try {
        localStorage.setItem(SOUND_ENABLED_KEY, String(preferences.sound))
      } catch {
        // Blocked storage: sounds keep the device's setting.
      }
    }
  }, [preferences, restricted])

  return null
}
