import { useThemeStore } from '@/store/useThemeStore'
import { cn } from '@/lib/utils'

function ThemeIcon({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-text-muted">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** The one theme switch, shared by every header so the theme is reachable
 * from any page, not only the algorithm page. */
export default function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-surface dark:hover:bg-dark-border',
        className,
      )}
    >
      <ThemeIcon isDark={isDark} />
    </button>
  )
}
