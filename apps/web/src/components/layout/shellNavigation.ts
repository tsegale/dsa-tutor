import { createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

// How the shell navigates. Pages navigate directly; the workspace provides a
// session-exit request instead (see AppShell.tsx and sessionExit.ts), so
// leaving a session always asks for the session-end survey first. Anything
// that links into the curriculum navigates through this.
export const ShellNavigation = createContext<((to: string) => void) | null>(null)

/** The provided navigation, or plain navigation where none is provided. */
export function useShellNavigate(): (to: string) => void {
  const provided = useContext(ShellNavigation)
  const navigate = useNavigate()
  return provided ?? navigate
}
