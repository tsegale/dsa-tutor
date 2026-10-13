import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_LEARNING_PREFERENCES } from '@dsa-tutor/types'
import { selectHintDelaySeconds, selectScaffolding, usePreferencesStore } from './usePreferencesStore'

const minimal = { ...DEFAULT_LEARNING_PREFERENCES, scaffolding: 'MINIMAL' as const, hintDelaySeconds: null }

describe('usePreferencesStore', () => {
  beforeEach(() => usePreferencesStore.setState({ saved: DEFAULT_LEARNING_PREFERENCES, participant: false }))

  it('applies a learner’s saved learning settings', () => {
    usePreferencesStore.getState().setSaved(minimal)
    expect(selectScaffolding(usePreferencesStore.getState())).toBe('MINIMAL')
    expect(selectHintDelaySeconds(usePreferencesStore.getState())).toBeNull()
  })

  it('pins a participant to the defaults whatever was saved', () => {
    usePreferencesStore.getState().setSaved(minimal)
    usePreferencesStore.getState().setParticipant(true)
    expect(selectScaffolding(usePreferencesStore.getState())).toBe('ADAPTIVE')
    expect(selectHintDelaySeconds(usePreferencesStore.getState())).toBe(25)
  })
})
