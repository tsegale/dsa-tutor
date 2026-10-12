import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint'
import { useStudyScope } from '@/hooks/useStudyScope'
import { fetchStudyStatus, withdrawFromStudy } from '@/api/study'
import { TRACKS, topicPath } from '@/data/tracks'
import { DSATutorLogo, StudentAvatar } from '@/components/brand'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/Kbd'
import ThemeToggle from '@/components/ui/ThemeToggle'
import AccountIdentity from './AccountIdentity'
import { CommandPalette } from './CommandPalette'
import { CurriculumPanel } from '@/components/curriculum/CurriculumPanel'
import { ShellNavigation, useShellNavigate } from './shellNavigation'

// The app's one header, shared by Home, the track pages, Progress and the
// algorithm workspace: wordmark, breadcrumb, Home / Tracks / Progress,
// topic search (Ctrl/Cmd+K) and the theme and account controls.
//
// Every navigation the shell starts goes through `go`. Pages navigate
// directly; the workspace overrides it so leaving a session (breadcrumb,
// palette, nav) asks AlgorithmPage first, which may show the session-end
// survey before it navigates.

export interface Crumb {
  label: string
  /** Omitted for the current page. */
  to?: string
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function ChevronDownIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const go = useShellNavigate()
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-small">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li
              key={`${crumb.label}-${index}`}
              // On a phone only the current page shows; the nav covers the rest.
              className={cn('flex min-w-0 items-center gap-1.5', !isLast && 'hidden md:flex')}
            >
              {crumb.to && !isLast ? (
                <a
                  href={crumb.to}
                  onClick={(event) => {
                    event.preventDefault()
                    go(crumb.to!)
                  }}
                  className="truncate rounded-sm text-ink-2 hover:text-ink hover:underline"
                >
                  {crumb.label}
                </a>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="truncate font-medium text-ink">
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className="text-ink-3">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  const go = useShellNavigate()
  return (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        go(to)
      }}
      className={cn(
        'relative inline-flex h-14 items-center px-1 text-small font-medium transition-colors duration-quick',
        active ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand' : 'text-ink-2 hover:text-ink'
      )}
    >
      {children}
    </a>
  )
}

function TracksMenu({ active }: { active: boolean }) {
  const go = useShellNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative inline-flex h-14 items-center gap-1 px-1 text-small font-medium transition-colors duration-quick',
            active ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand' : 'text-ink-2 hover:text-ink'
          )}
        >
          Tracks
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {TRACKS.map((track) => (
          <DropdownMenuItem key={track.slug} onSelect={() => go(`/track/${track.slug}`)}>
            {track.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountMenu({ inWorkspace }: { inWorkspace: boolean }) {
  const go = useShellNavigate()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const { isTooSmall } = useLayoutBreakpoint()
  const { restricted } = useStudyScope()
  // Launches the walkthrough directly rather than resetting onboarding,
  // which would reopen the welcome modal first (remediation doc 9.7).
  const { startTour } = useOnboarding()
  // Shares the ['study', 'status'] cache with App.tsx's StudyGate.
  const { data: studyStatus } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const withdrawMutation = useMutation({
    mutationFn: withdrawFromStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      setConfirmingWithdraw(false)
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Account menu" className="flex shrink-0 items-center justify-center rounded-full">
            <StudentAvatar initials={user?.name?.[0]?.toUpperCase() ?? '?'} size={30} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <AccountIdentity />
          {/* Below md the Home / Tracks / Progress links are hidden from the
              bar, so the menu carries them. Rendered conditionally, not
              hidden with CSS: a hidden item would stay in the menu's
              arrow-key order. */}
          {isTooSmall && (
            <>
              <DropdownMenuItem onSelect={() => go('/')}>Home</DropdownMenuItem>
              {!restricted &&
                TRACKS.map((track) => (
                  <DropdownMenuItem key={track.slug} onSelect={() => go(`/track/${track.slug}`)}>
                    {track.name}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem onSelect={() => go('/progress')}>Progress</DropdownMenuItem>
            </>
          )}
          {user?.role === 'EDUCATOR' && <DropdownMenuItem onSelect={() => go('/educator')}>Educator dashboard</DropdownMenuItem>}
          {!inWorkspace && <DropdownMenuItem onSelect={startTour}>Take the tour</DropdownMenuItem>}
          {studyStatus && !studyStatus.isParticipant && (
            <DropdownMenuItem onSelect={() => go('/study/join')}>Join the study</DropdownMenuItem>
          )}
          {studyStatus?.isParticipant && !studyStatus.withdrawn && (
            <DropdownMenuItem onSelect={() => setConfirmingWithdraw(true)}>Withdraw from study</DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              logout()
              navigate('/auth')
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmingWithdraw} onOpenChange={setConfirmingWithdraw}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Withdraw from the study?</DialogTitle>
          <DialogDescription>
            Your data will be removed from every research export going forward. Your account and progress stay exactly as
            they are: this only stops you being studied, not your access.
          </DialogDescription>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmingWithdraw(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => withdrawMutation.mutate()} loading={withdrawMutation.isPending} className="flex-1">
              Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export interface AppTopBarProps {
  crumbs: Crumb[]
  /** Workspace only: controls after the breadcrumb (the support pill). */
  afterCrumbs?: ReactNode
  /** Workspace only: centred control (the mode toggle). */
  center?: ReactNode
  /** Workspace only: controls before search, theme and account. */
  actions?: ReactNode
  /** Workspace only: a thin step-progress line along the bottom edge. */
  progressPercent?: number
  /** Replaces direct navigation; see the note at the top of this file. */
  onNavigate?: (to: string) => void
}

export function AppTopBar({ crumbs, afterCrumbs, center, actions, progressPercent, onNavigate }: AppTopBarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { restricted } = useStudyScope()
  const inWorkspace = Boolean(onNavigate)
  const go = useCallback((to: string) => (onNavigate ? onNavigate(to) : navigate(to)), [navigate, onNavigate])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const shortcut = useMemo(() => (IS_MAC ? 'Cmd K' : 'Ctrl K'), [])

  return (
    <ShellNavigation.Provider value={go}>
      {!inWorkspace && (
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-small focus:text-ink focus:shadow-e2"
        >
          Skip to main content
        </a>
      )}
      <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center gap-4 border-b border-rule bg-surface px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <a
            href="/"
            aria-label="DSA Tutor home"
            onClick={(event) => {
              event.preventDefault()
              go('/')
            }}
            className="shrink-0 rounded-sm"
          >
            <DSATutorLogo variant="dark" showTagline={false} />
          </a>
          {!inWorkspace && (
            <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
              <NavLink to="/" active={pathname === '/'}>
                Home
              </NavLink>
              {/* A study participant's three topics sit in three tracks; one-topic
                  track pages would look broken, so Home lists them instead. */}
              {!restricted && <TracksMenu active={pathname.startsWith('/track/')} />}
              <NavLink to="/progress" active={pathname === '/progress'}>
                Progress
              </NavLink>
            </nav>
          )}
          {inWorkspace && (
            <>
              <span aria-hidden="true" className="h-5 w-px shrink-0 bg-rule" />
              <Breadcrumb crumbs={crumbs} />
              {afterCrumbs}
            </>
          )}
        </div>

        {center && <div className="shrink-0">{center}</div>}

        <div className="flex flex-1 items-center justify-end gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search topics"
            aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border border-rule-control bg-surface px-2.5 text-small whitespace-nowrap text-ink-2 transition-colors duration-quick hover:border-ink-2 hover:text-ink"
          >
            <SearchIcon />
            {/* The workspace bar is full; there the icon and shortcut say enough. */}
            {!inWorkspace && <span className="hidden lg:inline">Search topics</span>}
            <Kbd className="hidden sm:inline-flex">{shortcut}</Kbd>
          </button>
          <ThemeToggle />
          <AccountMenu inWorkspace={inWorkspace} />
        </div>

        {progressPercent !== undefined && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-brand transition-[width] duration-settle"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        )}
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSelect={(topic) => go(topicPath(topic.name))} />
    </ShellNavigation.Provider>
  )
}

/**
 * Page frame for Home, the track pages and Progress: the top bar, then the
 * breadcrumb (when the page is below Home) and the page content.
 */
export function AppShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppTopBar crumbs={crumbs} />
      <div className="flex min-h-0 flex-1">
        {/* The curriculum rail: pinned under the top bar, scrolling on its own. */}
        <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 lg:flex">
          <CurriculumPanel />
        </div>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-6 pb-16 outline-none md:px-gutter [&_h1]:outline-none">
          {crumbs.length > 1 && (
            <div className="mb-6">
              <BreadcrumbForPage crumbs={crumbs} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

function BreadcrumbForPage({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate()
  return (
    <ShellNavigation.Provider value={navigate}>
      <Breadcrumb crumbs={crumbs} />
    </ShellNavigation.Provider>
  )
}
