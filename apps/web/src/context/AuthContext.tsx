import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { getToken, logout as apiLogout } from '../api/auth'
import { apiFetch } from '../api/client'
import type { UserProfile } from '@dsa-tutor/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  logout: () => void
  refreshUser: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // The provider's own mount effect and a page's on-mount refreshUser()
  // (e.g. Dashboard, to surface XP earned on another page) can both fire
  // within milliseconds of each other. This ref collapses any overlapping
  // calls into the single in-flight request instead of issuing two.
  const inFlightRef = useRef<Promise<UserProfile | null> | null>(null)

  function loadUser(): Promise<UserProfile | null> {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const request = (async () => {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return null
      }
      try {
        const profile = await apiFetch<UserProfile>('/api/v1/auth/me')
        setUser(profile)
        return profile
      } catch {
        apiLogout()
        return null
      } finally {
        setIsLoading(false)
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = request
    return request
  }

  useEffect(() => {
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function logout() {
    apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
