import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LEARNING_PREFERENCES } from '@dsa-tutor/types'
import { savePreferences, withDefaults } from './preferences.service'

const { findUnique, update } = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }))
vi.mock('../lib/prisma', () => ({ prisma: { user: { findUnique, update } } }))

const chosen = { scaffolding: 'MINIMAL', hintDelaySeconds: 40, sound: true, reducedMotion: 'ALWAYS', theme: 'DARK' } as const

describe('withDefaults', () => {
  it('fills in the defaults for nothing saved', () => {
    expect(withDefaults(null)).toEqual(DEFAULT_LEARNING_PREFERENCES)
  })

  it('keeps valid choices, including turning proactive hints off', () => {
    expect(withDefaults({ ...chosen, hintDelaySeconds: null })).toEqual({ ...chosen, hintDelaySeconds: null })
  })

  it('replaces anything unrecognised with its default', () => {
    expect(withDefaults({ scaffolding: 'TURBO', hintDelaySeconds: 3, sound: 'yes', theme: 'DARK' })).toEqual({ ...DEFAULT_LEARNING_PREFERENCES, theme: 'DARK' })
  })
})

describe('savePreferences', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves a non-participant’s preferences', async () => {
    findUnique.mockResolvedValue({ participantCode: null, consentAt: null, withdrawnAt: null })
    expect(await savePreferences('u1', chosen)).toEqual(chosen)
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { preferences: chosen } })
  })

  it('refuses an active participant, whose learning settings are fixed', async () => {
    findUnique.mockResolvedValue({ participantCode: 'P01', consentAt: new Date(), withdrawnAt: null })
    await expect(savePreferences('p1', chosen)).rejects.toThrow('STUDY_SETTINGS_FIXED')
    expect(update).not.toHaveBeenCalled()
  })

  it('lets a withdrawn participant save again', async () => {
    findUnique.mockResolvedValue({ participantCode: 'P01', consentAt: new Date(), withdrawnAt: new Date() })
    await expect(savePreferences('p1', chosen)).resolves.toEqual(chosen)
  })
})
