import { useAuth } from '@/context/AuthContext'

/** Non-interactive top of the account menu: which account is signed in, and
 * in which role (Phase 4F). */
export default function AccountIdentity() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="px-2 py-1.5">
      <p className="truncate text-small font-medium text-ink">{user.name}</p>
      <p className="truncate text-micro text-ink-2">{user.email}</p>
      <p className="mt-1 text-micro text-ink-2">{user.role === 'EDUCATOR' ? 'Educator' : 'Student'}</p>
    </div>
  )
}
