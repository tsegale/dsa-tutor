import { useAuth } from '@/context/AuthContext'

/** Non-interactive header for an account dropdown - states which account
 * is signed in. Shared by the dashboard and algorithm page menus so the
 * two cannot drift (remediation doc 9.5, Week 1 1A.5). */
export default function AccountIdentity() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="border-b border-border px-2 py-1.5">
      <p className="truncate text-sm font-medium text-text-primary dark:text-dark-text-primary">{user.name}</p>
      <p className="truncate text-xs text-text-muted dark:text-dark-text-secondary">{user.email}</p>
    </div>
  )
}
