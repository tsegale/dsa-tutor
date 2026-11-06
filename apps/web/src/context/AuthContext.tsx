import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { getToken, logout as apiLogout } from '../api/auth'
import { ApiError, apiFetch } from '../api/client'
import { queryClient } from '@/lib/queryClient'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { useMisconceptionStore } from '@/store/useMisconceptionStore'
import type { UserProfile, UserRole } from '@dsa-tutor/types'

interface SessionUserInput {
  id: string
  email: string
  name: string
  role: UserRole | string
  xpTotal?: number
  streakCount?: number
  lastActiveDate?: string | null
  createdAt?: string
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  logout: () => void
  refreshUser: () => Promise<UserProfile | null>
  applySessionUser: (profile: UserProfile | SessionUserInput) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function clearUserSessionStores() {
  queryClient.clear()
  useAlgorithmStore.setState(useAlgorithmStore.getInitialState(), true)
  useMisconceptionStore.setState({
    activeEvents: [],
    pendingRemediation: null,
    lastBottomedOutCategory: null,
    checksInFlight: 0,
    handledJunctions: new Set(),
  })
  try {
    localStorage.removeItem('dsa-tutor-awarded-badges')
  } catch {
    // Storage may be unavailable in restricted contexts.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Collapses concurrent refreshes for the SAME token into one request while
  // never letting an unauthenticated pre-login check swallow a post-login fetch.
  const inFlightRef = useRef<{ token: string | null; promise: Promise<UserProfile | null> } | null>(null)

  function loadUser(): Promise<UserProfile | null> {
    const currentToken = getToken()
    if (inFlightRef.current && inFlightRef.current.token === currentToken) {
      return inFlightRef.current.promise
    }

    const request = (async () => {
      if (!currentToken) {
        setIsLoading(false)
        return null
      }
      try {
        const profile = await apiFetch<UserProfile>('/api/v1/auth/me')
        setUser(profile)
        return profile
      } catch (error) {
        // Sign out only when the server rejected the token. A dropped
        // connection or a 5xx said nothing about the token, and clearing it
        // there signed people out on every network blip: the next request
        // went out without a token, so a retry could never succeed.
        if (error instanceof ApiError && error.status === 401) {
          apiLogout()
          setUser(null)
        }
        return null
      } finally {
        setIsLoading(false)
        if (inFlightRef.current?.token === currentToken) {
          inFlightRef.current = null
        }
      }
    })()

    inFlightRef.current = { token: currentToken, promise: request }
    return request
  }

  useEffect(() => {
    void loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applySessionUser(profile: UserProfile | SessionUserInput) {
    if (user?.id && user.id !== profile.id) {
      clearUserSessionStores()
    } else {
      queryClient.clear()
    }
    inFlightRef.current = null
    const normalized: UserProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: (profile.role as UserRole) ?? 'STUDENT',
      xpTotal: profile.xpTotal ?? 0,
      streakCount: profile.streakCount ?? 0,
      lastActiveDate: profile.lastActiveDate ?? null,
      createdAt: profile.createdAt ?? new Date().toISOString(),
    }
    setUser(normalized)
    setIsLoading(false)
  }

  function logout() {
    apiLogout()
    inFlightRef.current = null
    clearUserSessionStores()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser: loadUser, applySessionUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
