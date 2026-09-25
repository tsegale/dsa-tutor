import { create } from 'zustand'

export type Theme = 'light' | 'dark'

// Also read by the inline script in index.html, which applies the class
// before first paint so a reload never flashes the light theme.
export const THEME_STORAGE_KEY = 'dsa-tutor-theme'

function readStoredTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' || saved === 'light' ? saved : null
  } catch {
    // Storage blocked (private window, cleared site data): fall through
    // to the OS preference rather than failing the whole app.
    return null
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}

/** An explicit choice wins; until one is made, the OS preference does. */
export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? (prefersDark() ? 'dark' : 'light')
}

interface ThemeStoreState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  theme: resolveInitialTheme(),

  setTheme(theme) {
    set({ theme })
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The theme still applies for this visit; it just won't persist.
    }
  },

  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))
