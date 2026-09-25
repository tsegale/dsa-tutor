import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { useAlgorithmStore, selectProgressPercent } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StudentAvatar } from '@/components/brand'
import AccountIdentity from './AccountIdentity'
import ModeToggle from '@/components/ui/ModeToggle'
import ProgressBar from '@/components/ui/ProgressBar'
import SoundToggle from '@/components/ui/SoundToggle'
import ZPDScaffoldingPill from '@/components/ui/ZPDScaffoldingPill'

const THEME_STORAGE_KEY = 'dsa-tutor-theme'
export const OPEN_SHORTCUTS_MODAL_EVENT = 'dsa-tutor:open-shortcuts-modal'
// AlgorithmPage owns whether leaving now should show the session-end
// survey first (it knows the active DB session id); this button only
// signals the intent to leave, it never navigates directly.
export const REQUEST_SESSION_EXIT_EVENT = 'dsa-tutor:request-session-exit'

const TRACK_DISPLAY_NAMES: Record<AlgorithmTrack, string> = {
  [AlgorithmTrack.FOUNDATIONS]: 'Foundations',
  [AlgorithmTrack.SORTING]: 'Sorting',
  [AlgorithmTrack.TREES]: 'Trees',
  [AlgorithmTrack.GRAPHS]: 'Graphs',
  [AlgorithmTrack.SEARCHING]: 'Searching',
  [AlgorithmTrack.TECHNIQUES]: 'Techniques',
}

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={active ? 'text-primary' : 'text-text-muted dark:text-dark-text-secondary'}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ThemeIcon({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted dark:text-dark-text-secondary">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-text-muted dark:text-dark-text-secondary">
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

function BackToDashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
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

  // Looked up from the URL slug, not the store's algorithmName: an
  // AlgorithmPage effect overwrites algorithmName with the topic's
  // display name (e.g. "Binary Search Tree") once the topics API call
  // resolves, so a registry lookup keyed on that field would fail here
  // and leave the track blank.
  const registryEntry = getAlgorithmRegistryEntry(algorithmSlug ?? '')
  const algorithmDisplayName = registryEntry?.displayName ?? algorithmName
  const trackDisplayName = registryEntry ? TRACK_DISPLAY_NAMES[registryEntry.track] : ''

  return (
    <header className="relative flex h-14 w-full items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1 text-[13px]">
          <span className="text-text-muted dark:text-dark-text-secondary">Dashboard</span>
          <span className="text-text-muted dark:text-dark-text-secondary">/</span>
          <span className="text-text-muted dark:text-dark-text-secondary">{trackDisplayName}</span>
          <span className="text-text-muted dark:text-dark-text-secondary">/</span>
          <span className="font-bold text-primary">{algorithmDisplayName}</span>
        </nav>
        <ZPDScaffoldingPill />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeToggle />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-32">
            <ProgressBar />
          </div>
          <span className="text-[11px] whitespace-nowrap text-text-muted dark:text-dark-text-secondary">
            Step {Math.min(stepIndex + 1, snapshotArray.length)} of {snapshotArray.length}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleFocusMode}
              aria-label="Toggle focus mode"
              className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-surface dark:hover:bg-dark-border"
            >
              <EyeIcon active={focusModeActive} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Focus Mode (F)</TooltipContent>
        </Tooltip>

        <div className="shrink-0">
          <SoundToggle />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-surface"
        >
          <ThemeIcon isDark={isDark} />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={resetAlgorithm} className="shrink-0 gap-1.5">
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
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
        >
          ?
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account menu" className="flex shrink-0 items-center justify-center rounded-full">
              <StudentAvatar initials={user?.name?.[0]?.toUpperCase() ?? '?'} size={28} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AccountIdentity />
            <DropdownMenuItem
              onSelect={() => {
                logout()
                navigate('/auth')
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(REQUEST_SESSION_EXIT_EVENT))}
              aria-label="Back to dashboard"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
            >
              <BackToDashboardIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent>Back to dashboard</TooltipContent>
        </Tooltip>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] bg-primary"
        style={{ width: `${progressPercent}%` }}
        aria-hidden="true"
      />
    </header>
  )
}
