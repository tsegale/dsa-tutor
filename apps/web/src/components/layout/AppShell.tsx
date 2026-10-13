import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint'
import { useStudyScope } from '@/hooks/useStudyScope'
import { topicPath } from '@/data/tracks'
import { MODULES } from '@/config/curriculum'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DSATutorLogo, StudentAvatar } from '@/components/brand'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/Kbd'
import ThemeToggle from '@/components/ui/ThemeToggle'
import AccountIdentity from './AccountIdentity'
import { AccountStatusRows } from './AccountStatusRows'
import { CommandPalette } from './CommandPalette'
import { CurriculumPanel } from '@/components/curriculum/CurriculumPanel'
import { ShellNavigation, useShellNavigate } from './shellNavigation'
import { ScaffoldingChip } from './ScaffoldingChip'
import { StudyChip } from './StudyChip'

// The app's header, in two tiers (Phase 4A):
// - The global bar (56px) is the same element list on every page that has it:
//   Home, module pages, Progress and the algorithm workspace. Wordmark, main
//   nav, topic search (Ctrl/Cmd+K), theme and account. Nothing page-specific
//   goes in it, and it carries at most 7 interactive elements at any width.
// - The context bar (40px) sits under it only where a page has context: the
//   workspace's breadcrumb, mode tabs, step counter and session controls, or
//   a module page's number, title and progress.
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

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
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

/**
 * Educators only (Phase 4D): flip between the learner app and the educator
 * dashboard in one click, visible without opening a menu. It takes the Home
 * link's place, since "Student view" goes to Home. Students never get it in
 * the DOM at all.
 */
function RoleSwitcher({ educatorView }: { educatorView: boolean }) {
  const go = useShellNavigate()
  const segment = (to: string, label: string, active: boolean) => (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        go(to)
      }}
      className={cn(
        'inline-flex h-7 items-center rounded-[5px] px-3 text-small font-medium whitespace-nowrap transition-colors duration-quick',
        active ? 'bg-surface text-ink shadow-e1 ring-1 ring-rule-strong' : 'text-ink-2 hover:text-ink'
      )}
    >
      {label}
    </a>
  )
  return (
    <div role="group" aria-label="View" className="inline-flex items-center gap-0.5 rounded-sm bg-surface-sunk p-0.5">
      {segment('/', 'Student view', !educatorView)}
      {segment('/educator', 'Educator view', educatorView)}
    </div>
  )
}

function ModulesMenu({ active }: { active: boolean }) {
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
          Modules
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        {MODULES.map((module) => (
          <DropdownMenuItem key={module.id} onSelect={() => go(`/module/${module.number}`)}>
            <span className="w-16 shrink-0 text-mono-sm text-ink-2">Module {module.number}</span>
            {module.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Below 1024px the main nav collapses into one menu button (Phase 4G), so the
 * bar stays within seven elements. An educator keeps the role switcher in the
 * bar (it must stay one click away), so their menu holds Modules and Progress
 * only: "Student view" is already the way Home. Below 768px, where even the
 * switcher does not fit beside the wordmark, its two views join the menu.
 */
function NavMenu({ includeHome, includeModules, roleViews }: { includeHome: boolean; includeModules: boolean; roleViews: boolean }) {
  const go = useShellNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-small font-medium text-ink-2 transition-colors duration-quick hover:bg-surface-sunk hover:text-ink lg:hidden"
        >
          Menu
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        {roleViews && (
          <>
            <DropdownMenuItem onSelect={() => go('/')}>Student view</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go('/educator')}>Educator view</DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {includeHome && <DropdownMenuItem onSelect={() => go('/')}>Home</DropdownMenuItem>}
        {includeModules &&
          MODULES.map((module) => (
            <DropdownMenuItem key={module.id} onSelect={() => go(`/module/${module.number}`)}>
              <span className="w-16 shrink-0 text-mono-sm text-ink-2">Module {module.number}</span>
              {module.title}
            </DropdownMenuItem>
          ))}
        <DropdownMenuItem onSelect={() => go('/progress')}>Progress</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The avatar's menu: who is signed in and as what, then Profile and Log out
 * (Phase 6A moved the day streak and XP to the profile page). Study
 * enrolment, withdrawal and the tour live on the profile page too.
 */
function AccountMenu({ inWorkspace }: { inWorkspace: boolean }) {
  const go = useShellNavigate()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  // Below 1024px the status chips live here instead of in the bar.
  const { isCompact } = useLayoutBreakpoint()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="flex shrink-0 items-center justify-center rounded-full">
          <StudentAvatar initials={user?.name?.[0]?.toUpperCase() ?? '?'} size={30} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <AccountIdentity />
        {isCompact && <AccountStatusRows inWorkspace={inWorkspace} />}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => go('/profile')}>Profile</DropdownMenuItem>
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
  )
}

export interface AppTopBarProps {
  /** The context bar's content; omitted on pages without context. */
  context?: ReactNode
  /** Replaces direct navigation; see the note at the top of this file. */
  onNavigate?: (to: string) => void
  /** The topic open in the workspace, highlighted in the curriculum drawer. */
  currentTopicName?: string | null
}

export function AppTopBar({ context, onNavigate, currentTopicName = null }: AppTopBarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Below 1024px the curriculum rail is a drawer rather than a squeezed column.
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => setDrawerOpen(false), [pathname])
  const { restricted } = useStudyScope()
  const { user } = useAuth()
  const isEducator = user?.role === 'EDUCATOR'
  const { isTooSmall } = useLayoutBreakpoint()
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
      <div className="sticky top-0 z-30 w-full shrink-0">
        <header className="flex h-14 w-full items-center gap-4 border-b border-rule bg-surface px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open curriculum"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-sunk hover:text-ink lg:hidden"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {/* Not a link: Home is the first nav item, and a second way home
                would spend one of the bar's seven interactive elements. The
                descriptor hides below 1024px; the wordmark stays. */}
            <DSATutorLogo variant="dark" taglineClassName="hidden lg:block" className="shrink-0" />
            <nav aria-label="Main" className="flex items-center gap-5">
              {/* Rendered conditionally, not hidden with CSS, so the menu's
                  arrow-key order never holds an item that is not there. */}
              {isEducator && !isTooSmall && <RoleSwitcher educatorView={pathname.startsWith('/educator')} />}
              <NavMenu includeHome={!isEducator} includeModules={!restricted} roleViews={isEducator && isTooSmall} />
              {!isEducator && (
                <span className="hidden lg:contents">
                  <NavLink to="/" active={pathname === '/'}>
                    Home
                  </NavLink>
                </span>
              )}
              {/* A study participant's three topics sit in three modules; a
                  one-topic module page would look broken, so Home lists them. */}
              <span className="hidden lg:contents">
                {!restricted && <ModulesMenu active={pathname.startsWith('/track/') || pathname.startsWith('/module/')} />}
                <NavLink to="/progress" active={pathname === '/progress'}>
                  Progress
                </NavLink>
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {/* Status chips, a hairline, then search, theme and account. The
                group shows only when it holds a chip, so the hairline never
                stands alone, and only from 1024px: below that the drawer
                button joins the bar (Phase 4G moves the chips into the
                account menu). An educator is not a learner being scaffolded,
                so no scaffolding chip. */}
            <div className="hidden items-center gap-2 lg:has-[button]:flex">
              {user?.role !== 'EDUCATOR' && <ScaffoldingChip inWorkspace={inWorkspace} />}
              <StudyChip />
              <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search topics"
              aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
              // Secondary weight: it opens the command palette, it is not a
              // live input, and it should not be the heaviest thing in the bar.
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border border-rule-strong bg-surface-sunk px-2.5 text-small whitespace-nowrap text-ink-2 transition-colors duration-quick hover:border-ink-2 hover:text-ink"
            >
              <SearchIcon />
              <span className="hidden lg:inline">Search topics</span>
              <Kbd className="hidden sm:inline-flex">{shortcut}</Kbd>
            </button>
            <ThemeToggle />
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
            <AccountMenu inWorkspace={inWorkspace} />
          </div>
        </header>
        {context}
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSelect={(topic) => go(topicPath(topic.name))} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 max-w-[85vw] gap-0 p-0 lg:hidden" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Curriculum</SheetTitle>
          <CurriculumPanel variant="drawer" currentTopicName={currentTopicName} className="h-full" />
        </SheetContent>
      </Sheet>
    </ShellNavigation.Provider>
  )
}

/**
 * Page frame for Home, the module pages and Progress: the header tiers, the
 * curriculum rail and the page content. Only a module page passes `context`.
 */
export function AppShell({ context, children }: { context?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppTopBar context={context} />
      <div className="flex min-h-0 flex-1">
        {/* The curriculum rail: pinned under the header tiers, scrolling on its own. */}
        <div className={cn('sticky hidden shrink-0 lg:flex', context ? 'top-24 h-[calc(100vh-6rem)]' : 'top-14 h-[calc(100vh-3.5rem)]')}>
          <CurriculumPanel />
        </div>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-6 pb-16 outline-none md:px-gutter [&_h1]:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
