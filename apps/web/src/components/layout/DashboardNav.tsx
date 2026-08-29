import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <line x1="12" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <circle cx="6" cy="6" r="3" fill="currentColor" />
      <circle cx="18" cy="6" r="3" fill="currentColor" />
      <circle cx="12" cy="18" r="3" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-streak">
      <path d="M12 2c1 3-2 4.5-2 7.5A4.5 4.5 0 0 0 12 14a2.5 2.5 0 0 0 2.5-2.5c0-.9-.4-1.4-.8-1.9 2.3 1.2 3.8 3.6 3.8 6.4a5.5 5.5 0 0 1-11 0C6.5 12 8 9.5 8 7c0-2 1.5-3.8 4-5Z" />
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

  function handleSignOut() {
    logout()
    navigate('/auth')
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-2 text-primary">
        <LogoIcon />
        <span className="text-xl font-bold text-primary">DSA Tutor</span>
      </div>

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

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <FlameIcon />
              <span className="text-sm font-bold text-text-primary">{user?.streakCount ?? 0}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Day streak — practice daily to keep it alive</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1.5">
          <BoltIcon />
          <span className="text-sm font-bold text-text-primary">{user?.xpTotal ?? 0}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
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
