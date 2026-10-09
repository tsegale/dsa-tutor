import { createContext, useContext } from 'react'

// How the shell navigates. Pages navigate directly; the workspace swaps in a
// session-exit request (see AppShell.tsx), so anything the shell renders
// reaches its destination through this rather than through useNavigate.
export const ShellNavigation = createContext<(to: string) => void>(() => {})
export const useShellNavigate = () => useContext(ShellNavigation)
