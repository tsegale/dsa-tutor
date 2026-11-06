import { useAuth } from '@/context/AuthContext'

/** Non-interactive top of the account menu: which account is signed in, and
 * in which role (Phase 4F). */
export default function AccountIdentity() {
  const { user } = useAuth()
  if (!user) return null
  const isSyntheticDemoEmail = user.isDemo || user.email.endsWith('.invalid')
  const roleLabel = user.role === 'ADMIN' ? 'Admin' : user.role === 'EDUCATOR' ? 'Educator' : 'Student'

  return (
    <div className="px-2 py-1.5">
      <p className="truncate text-small font-medium text-ink">{user.name}</p>
      <p className="truncate text-micro text-ink-2">
        {isSyntheticDemoEmail ? 'Temporary demo session' : user.email}
      </p>
      <p className="mt-1 text-micro text-ink-2">{roleLabel}</p>
    </div>
  )
}
