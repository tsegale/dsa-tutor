import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Difficulty } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { logout } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import DifficultyTag from '@/components/ui/DifficultyTag'
import ModeToggle from '@/components/ui/ModeToggle'
import ProgressBar from '@/components/ui/ProgressBar'

const THEME_STORAGE_KEY = 'dsa-tutor-theme'
export const OPEN_SHORTCUTS_MODAL_EVENT = 'dsa-tutor:open-shortcuts-modal'

// Track and difficulty metadata for the current algorithm isn't sourced
// from the store yet (Phase 9+ wires topic data from the API). Bubble
// Sort is hardcoded here as the only algorithm through Phase 15.
const TRACK_NAME = 'Sorting'
const DIFFICULTY = Difficulty.BEGINNER

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={active ? 'text-primary' : 'text-text-muted'}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

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

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const toggleFocusMode = useAlgorithmStore((state) => state.toggleFocusMode)
  const resetAlgorithm = useAlgorithmStore((state) => state.resetAlgorithm)

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    // Reflects the actual DOM state regardless of what changed it (this
    // button, or the T keyboard shortcut, which mutates the class directly).
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark')
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light')
  }

  return (
    <header className="relative flex h-14 w-full items-center justify-between border-b border-border bg-white px-4">
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1 text-[13px]">
          <span className="text-text-muted">Dashboard</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-muted">{TRACK_NAME}</span>
          <span className="text-text-muted">/</span>
          <span className="font-bold text-primary">{algorithmName}</span>
        </nav>
        <DifficultyTag difficulty={DIFFICULTY} />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeToggle />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-32">
            <ProgressBar />
          </div>
          <span className="text-xs text-text-secondary">
            Step {Math.min(stepIndex + 1, snapshotArray.length)} of {snapshotArray.length}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleFocusMode}
              aria-label="Toggle focus mode"
              className="flex size-8 items-center justify-center rounded-md hover:bg-surface"
            >
              <EyeIcon active={focusModeActive} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Focus Mode (F)</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex size-8 items-center justify-center rounded-md hover:bg-surface"
        >
          <ThemeIcon isDark={isDark} />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={resetAlgorithm} className="gap-1.5">
              <RefreshIcon />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset (R)</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SHORTCUTS_MODAL_EVENT))}
          aria-label="Keyboard shortcuts"
          className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface"
        >
          ?
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/auth')
              }}
              aria-label="Log out"
              className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface"
            >
              <LogoutIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent>Log out</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
