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
import { ModuleIcon, getModuleTheme } from '@/components/home/TopicArtwork'
import { ShellNavigation, useShellNavigate } from './shellNavigation'
import { ScaffoldingChip } from './ScaffoldingChip'
import { StudyChip } from './StudyChip'
import { MotionPreference } from './MotionPreference'

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

export interface CrumbMenuItem {
  label: string
  to: string
  number?: string
  active?: boolean
}

export interface Crumb {
  label: string
  /** Omitted for the current page. */
  to?: string
  /** Optional sibling switcher menu on the current page crumb. */
  items?: CrumbMenuItem[]
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

function HomeNavIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2.5 7 8 2.5 13.5 7v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7Z" strokeLinejoin="round" />
      <path d="M6.25 14V9.5h3.5V14" strokeLinejoin="round" />
    </svg>
  )
}

function ModulesNavIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.25" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="2.25" y="9" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="9" width="4.75" height="4.75" rx="1" />
    </svg>
  )
}

function CompareNavIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 13V7m3.3 6V4m3.4 9V9M13 13V5" strokeLinecap="round" />
    </svg>
  )
}

function ProgressNavIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" />
      <path d="m5.5 8.2 1.8 1.8 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
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
              ) : isLast && crumb.items && crumb.items.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Switch topic from ${crumb.label}`}
                      className="inline-flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-ink transition-colors duration-quick hover:bg-surface-sunk"
                    >
                      <span className="truncate">{crumb.label}</span>
                      <ChevronDownIcon />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-80 min-w-64 overflow-y-auto">
                    {crumb.items.map((item) => (
                      <DropdownMenuItem
                        key={item.to}
                        onSelect={() => {
                          if (!item.active) go(item.to)
                        }}
                        className={cn(item.active && 'bg-brand-soft font-semibold text-ink')}
                      >
                        {item.number && <span className="w-8 shrink-0 text-mono-sm text-ink-2">{item.number}</span>}
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
        'relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-small font-medium transition-colors duration-quick',
        active
          ? 'bg-brand-soft font-semibold text-brand ring-1 ring-brand/25'
          : 'text-ink-2 hover:bg-surface-sunk hover:text-ink',
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
            'relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-small font-medium transition-colors duration-quick',
            active
              ? 'bg-brand-soft font-semibold text-brand ring-1 ring-brand/25'
              : 'text-ink-2 hover:bg-surface-sunk hover:text-ink',
          )}
        >
          <ModulesNavIcon />
          Modules
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-72 p-1.5">
        {MODULES.map((module) => {
          const theme = getModuleTheme(module.number)
          return (
            <DropdownMenuItem
              key={module.id}
              onSelect={() => go(`/module/${module.number}`)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2"
            >
              <ModuleIcon moduleNumber={module.number} className="size-7" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className="rounded px-1.5 py-0.2 font-mono text-[10px] font-bold"
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                  >
                    M{module.number}
                  </span>
                  <span className="truncate text-small font-medium text-ink">{module.title}</span>
                </div>
                <span className="truncate text-micro text-ink-2">{module.topics.length} topics</span>
              </div>
            </DropdownMenuItem>
          )
        })}
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
        {includeModules && <DropdownMenuItem onSelect={() => go('/compare')}>Compare</DropdownMenuItem>}
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
  const isEducator = user?.role === 'EDUCATOR' || user?.role === 'ADMIN'
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
        <header className="flex h-15 w-full items-center gap-4 border-t-2 border-b border-rule border-t-brand bg-surface px-4 shadow-e1 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open curriculum"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-sm border border-rule bg-surface-sunk text-ink-2 hover:border-brand hover:text-ink lg:hidden"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {/* Not a link: Home is the first nav item, and a second way home
                would spend one of the bar's seven interactive elements. The
                descriptor hides below 1024px; the wordmark stays. */}
            <DSATutorLogo variant="dark" taglineClassName="hidden xl:block" className="shrink-0" />
            <span aria-hidden="true" className="hidden h-6 w-px bg-rule lg:block" />
            <nav aria-label="Main" className="flex items-center gap-1.5">
              {/* Rendered conditionally, not hidden with CSS, so the menu's
                  arrow-key order never holds an item that is not there. */}
              {isEducator && !isTooSmall && <RoleSwitcher educatorView={pathname.startsWith('/educator')} />}
              <NavMenu includeHome={!isEducator} includeModules={!restricted} roleViews={isEducator && isTooSmall} />
              {!isEducator && (
                <span className="hidden lg:contents">
                  <NavLink to="/" active={pathname === '/'}>
                    <HomeNavIcon />
                    Home
                  </NavLink>
                </span>
              )}
              {/* A study participant's three topics sit in three modules; a
                  one-topic module page would look broken, so Home lists them. */}
              <span className="hidden lg:contents">
                {!restricted && <ModulesMenu active={pathname.startsWith('/track/') || pathname.startsWith('/module/')} />}
                {!restricted && (
                  <NavLink to="/compare" active={pathname.startsWith('/compare')}>
                    <CompareNavIcon />
                    Compare
                  </NavLink>
                )}
                <NavLink to="/progress" active={pathname === '/progress'}>
                  <ProgressNavIcon />
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
              className="inline-flex h-9 shrink-0 items-center gap-2.5 rounded-md border border-rule-strong bg-surface-sunk/80 px-3 text-small whitespace-nowrap text-ink-2 transition-colors duration-quick hover:border-brand hover:bg-surface hover:text-ink"
            >
              <span className="text-brand">
                <SearchIcon />
              </span>
              <span className="hidden lg:inline">Search topics...</span>
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
    <MotionPreference>
      <div className="flex min-h-screen flex-col bg-dot-grid">
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
    </MotionPreference>
  )
}
