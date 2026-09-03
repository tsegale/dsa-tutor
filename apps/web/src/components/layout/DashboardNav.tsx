import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getProgressToNextLevel } from '@/utils/xpLevels'
import { DSATutorLogo, StudentAvatar } from '@/components/brand'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-secondary">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}

export default function DashboardNav() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { resetOnboarding } = useOnboarding()
  const xpProgress = getProgressToNextLevel(user?.xpTotal ?? 0)

  function handleSignOut() {
    logout()
    navigate('/auth')
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-white px-6">
      <DSATutorLogo variant="dark" showTagline={false} />

      <div className="relative w-80">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search algorithms..."
          className="w-full rounded-full border border-border py-2 pr-4 pl-9 text-sm outline-none focus:border-text-muted"
        />
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={resetOnboarding}
          className="text-xs text-primary hover:underline"
        >
          Take the tour
        </button>

        {user?.role === 'EDUCATOR' && (
          <button
            type="button"
            onClick={() => navigate('/educator')}
            className="rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-light"
          >
            Educator Dashboard
          </button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: xpProgress.level.colour }} />
              <span className="text-sm font-semibold text-text-primary">{xpProgress.level.title}</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${xpProgress.percent}%`, backgroundColor: xpProgress.level.colour }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-1.5">
              <BoltIcon />
              <span>
                {user?.xpTotal ?? 0} XP · {xpProgress.level.title}
              </span>
            </div>
            <div className="text-muted-foreground">
              {xpProgress.nextLevel
                ? `${xpProgress.xpForNextLevel! - (user?.xpTotal ?? 0)} XP to ${xpProgress.nextLevel.title}`
                : 'Max level reached'}
            </div>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account menu" className="flex items-center justify-center rounded-full">
              <StudentAvatar initials={user?.name?.[0]?.toUpperCase() ?? '?'} size={32} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
