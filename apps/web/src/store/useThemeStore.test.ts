import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, resolveInitialTheme, useThemeStore } from './useThemeStore'

function stubEnvironment({ saved, osDark }: { saved: string | null; osDark: boolean }) {
  const store = new Map<string, string>(saved === null ? [] : [[THEME_STORAGE_KEY, saved]])
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: osDark }) })
  return store
}

describe('resolveInitialTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the OS preference on a first visit', () => {
    stubEnvironment({ saved: null, osDark: true })
    expect(resolveInitialTheme()).toBe('dark')
    stubEnvironment({ saved: null, osDark: false })
    expect(resolveInitialTheme()).toBe('light')
  })

  it('lets an explicit saved choice override the OS preference', () => {
    stubEnvironment({ saved: 'light', osDark: true })
    expect(resolveInitialTheme()).toBe('light')
  })

  it('ignores an unrecognised stored value', () => {
    stubEnvironment({ saved: 'purple', osDark: false })
    expect(resolveInitialTheme()).toBe('light')
  })

  it('falls back to the OS preference when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    expect(resolveInitialTheme()).toBe('dark')
  })
})

describe('useThemeStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists a toggle so it survives a reload', () => {
    const storage = stubEnvironment({ saved: null, osDark: false })
    useThemeStore.setState({ theme: 'light' })
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(storage.get(THEME_STORAGE_KEY)).toBe('dark')
  })
})
