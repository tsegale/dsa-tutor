import type { LearningPreferences } from '@dsa-tutor/types'
import { DEFAULT_LEARNING_PREFERENCES } from '../config/preferences'
import { prisma } from '../lib/prisma'
import { isActiveParticipant } from './study.service'

/**
 * Saved preferences with the defaults filled in. Anything unrecognised in the
 * stored JSON falls back to its default rather than reaching the app.
 */
export function withDefaults(stored: unknown): LearningPreferences {
  const value = (stored && typeof stored === 'object' ? stored : {}) as Partial<Record<keyof LearningPreferences, unknown>>
  const d = DEFAULT_LEARNING_PREFERENCES
  return {
    scaffolding: value.scaffolding === 'FULL' || value.scaffolding === 'MINIMAL' || value.scaffolding === 'ADAPTIVE' ? value.scaffolding : d.scaffolding,
    hintDelaySeconds:
      value.hintDelaySeconds === null || value.hintDelaySeconds === 15 || value.hintDelaySeconds === 25 || value.hintDelaySeconds === 40
        ? value.hintDelaySeconds
        : d.hintDelaySeconds,
    sound: typeof value.sound === 'boolean' ? value.sound : d.sound,
    reducedMotion: value.reducedMotion === 'ALWAYS' || value.reducedMotion === 'SYSTEM' ? value.reducedMotion : d.reducedMotion,
    theme: value.theme === 'LIGHT' || value.theme === 'DARK' || value.theme === 'SYSTEM' ? value.theme : d.theme,
  }
}

/**
 * Save a learner's preferences (Phase 6D). An active study participant's
 * learning settings are fixed so results stay comparable: refused here, and
 * ignored by the app even if saved before they enrolled.
 */
export async function savePreferences(userId: string, preferences: LearningPreferences): Promise<LearningPreferences> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { participantCode: true, consentAt: true, withdrawnAt: true } })
  if (!user) throw new Error('NOT_FOUND')
  if (isActiveParticipant(user)) throw new Error('STUDY_SETTINGS_FIXED')
  const saved = withDefaults(preferences)
  // A plain record: Prisma's JSON input type needs an index signature.
  const json: Record<string, string | number | boolean | null> = { ...saved }
  await prisma.user.update({ where: { id: userId }, data: { preferences: json } })
  return saved
}
