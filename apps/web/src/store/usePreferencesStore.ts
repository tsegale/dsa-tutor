import { create } from 'zustand'
import { DEFAULT_LEARNING_PREFERENCES, type LearningPreferences } from '@dsa-tutor/types'

/**
 * The learner's preferences as the app applies them (Phase 6D), synced from
 * the server by PreferencesSync. `saved` is what the profile shows and edits.
 * For an active study participant the learning settings (scaffolding and the
 * proactive hint delay) are pinned to the defaults whatever was saved, so
 * results stay comparable; read the effective values with the selectors.
 */
interface PreferencesState {
  saved: LearningPreferences
  /** An active study participant: learning settings fixed. */
  participant: boolean
  setSaved: (saved: LearningPreferences) => void
  setParticipant: (participant: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  saved: DEFAULT_LEARNING_PREFERENCES,
  participant: false,
  setSaved: (saved) => set({ saved }),
  setParticipant: (participant) => set({ participant }),
}))

/** The scaffolding intensity in force: always ADAPTIVE for a participant. */
export const selectScaffolding = (state: PreferencesState) => (state.participant ? DEFAULT_LEARNING_PREFERENCES.scaffolding : state.saved.scaffolding)

/** The proactive hint delay in force: always the default for a participant. */
export const selectHintDelaySeconds = (state: PreferencesState) => (state.participant ? DEFAULT_LEARNING_PREFERENCES.hintDelaySeconds : state.saved.hintDelaySeconds)

export const selectReducedMotionForced = (state: PreferencesState) => state.saved.reducedMotion === 'ALWAYS'
