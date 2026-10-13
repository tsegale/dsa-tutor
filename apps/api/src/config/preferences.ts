import type { LearningPreferences } from '@dsa-tutor/types'

// The api's copy of the default learning preferences (Phase 6D). The shared
// types package is TypeScript source with no build step: the web bundles it,
// but the compiled api runs on plain Node and can only import types from it,
// never values. preferences.service.test.ts checks this matches the shared
// DEFAULT_LEARNING_PREFERENCES the web uses.
export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  scaffolding: 'ADAPTIVE',
  hintDelaySeconds: 25,
  sound: false,
  reducedMotion: 'SYSTEM',
  theme: 'SYSTEM',
}
