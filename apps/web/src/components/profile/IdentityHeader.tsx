import { useState } from 'react'
import type { UserProfile } from '@dsa-tutor/types'
import { getLevelForXP } from '@/utils/xpLevels'
import { StudentAvatar } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from './ChangePasswordDialog'

/**
 * The profile's identity block (Phase 6A): who this is, in which role, since
 * when, and the two running figures the account menu used to carry, day
 * streak and XP. Demo accounts have no password to change.
 */
export function IdentityHeader({ user }: { user: UserProfile }) {
  const [changingPassword, setChangingPassword] = useState(false)
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const level = getLevelForXP(user.xpTotal)

  return (
    <section aria-labelledby="profile-name" className="rounded-md border border-rule bg-surface p-panel">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <StudentAvatar initials={user.name?.[0]?.toUpperCase() ?? '?'} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-micro text-ink-2">Profile</p>
          <h1 id="profile-name" className="mt-0.5 truncate text-h1 text-ink">
            {user.name}
          </h1>
          <p className="mt-1 truncate text-small text-ink-2">{user.email}</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-small text-ink-2">
            <span className="font-medium text-ink">{user.role === 'EDUCATOR' ? 'Educator' : 'Student'}</span>
            {memberSince && (
              <>
                <span aria-hidden="true">·</span>
                <span>Member since {memberSince}</span>
              </>
            )}
          </p>
        </div>
        {!user.isDemo && (
          <Button variant="secondary" size="sm" className="self-start sm:self-center" onClick={() => setChangingPassword(true)}>
            Change password
          </Button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-rule pt-4 sm:max-w-md">
        <div>
          <dt className="text-micro text-ink-2">Day streak</dt>
          <dd className="mt-0.5 text-mono-lg text-ink tabular-nums">{user.streakCount}</dd>
        </div>
        <div>
          <dt className="text-micro text-ink-2">XP</dt>
          <dd className="mt-0.5 text-mono-lg text-ink tabular-nums">
            {user.xpTotal} <span className="text-mono-sm text-ink-2">{level.title}</span>
          </dd>
        </div>
      </dl>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </section>
  )
}
