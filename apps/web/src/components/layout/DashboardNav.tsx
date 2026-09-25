import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { fetchStudyStatus, withdrawFromStudy } from '@/api/study'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getProgressToNextLevel } from '@/utils/xpLevels'
import { DSATutorLogo, StudentAvatar } from '@/components/brand'
import AccountIdentity from './AccountIdentity'

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
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  // Launches the walkthrough directly rather than resetOnboarding(), which
  // reopens the welcome modal first - that modal has its own "Take the
  // tour" button, so the header button used to require two clicks and the
  // tour's first step repeated the same welcome text the modal just showed
  // (see remediation doc 9.7).
  const { startTour } = useOnboarding()
  const xpProgress = getProgressToNextLevel(user?.xpTotal ?? 0)

  // Shares the ['study', 'status'] cache with App.tsx's StudyGate - a
  // non-participant gets isParticipant: false and this menu item never
  // shows, so this query costs nothing extra for the common case.
  const { data: studyStatus } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const withdrawMutation = useMutation({
    mutationFn: withdrawFromStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      setConfirmingWithdraw(false)
    },
  })

  function handleSignOut() {
    logout()
    navigate('/auth')
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6">
      <DSATutorLogo variant="dark" showTagline={false} />

      <div className="relative w-80">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search algorithms..."
          aria-label="Search algorithms"
          className="w-full rounded-full border border-border py-2 pr-4 pl-9 text-sm outline-none focus:border-text-muted"
        />
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={startTour}
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
            {/* No Profile item: there is no profile page to open, and a
                disabled menu item with no explanation is worse than no
                item at all. */}
            <AccountIdentity />
            {studyStatus && !studyStatus.isParticipant && (
              <DropdownMenuItem onSelect={() => navigate('/study/join')}>Join the study</DropdownMenuItem>
            )}
            {studyStatus?.isParticipant && !studyStatus.withdrawn && (
              <DropdownMenuItem onSelect={() => setConfirmingWithdraw(true)}>
                Withdraw from study
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmingWithdraw} onOpenChange={setConfirmingWithdraw}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col gap-4 py-2">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Withdraw from the study?</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Your data will be removed from every research export going forward. Your account and
                progress stay exactly as they are - this only stops you being studied, not your access.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmingWithdraw(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="flex-1"
              >
                Withdraw
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
