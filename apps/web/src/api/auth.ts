import { apiFetch } from './client'

// Token storage: localStorage, not an httpOnly cookie.
//
// The frontend (Vercel), api (Railway) and ai service (Railway) are three
// different origins. An httpOnly cookie would need SameSite=None; Secure
// plus a CSRF token scheme layered on top, on every authenticated route in
// apps/api, right before the data-collection phase begins with real student
// participants - a materially higher-risk change than the XSS exposure it
// would close. The threat model here (a research prototype with no
// financial data, evaluated by a set of recruited students) does not
// currently justify that risk. Accepted as a stated limitation for the
// dissertation (Chapter 5) rather than fixed in code.
interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  xpTotal: number
  streakCount: number
}

interface AuthResult {
  token: string
  user: AuthUser
}

export async function register(email: string, password: string, name: string) {
  const result = await apiFetch<AuthResult>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
  localStorage.setItem('dsa-tutor-token', result.token)
  return result
}

export async function login(email: string, password: string) {
  const result = await apiFetch<AuthResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('dsa-tutor-token', result.token)
  return result
}

export function logout() {
  localStorage.removeItem('dsa-tutor-token')
}

export function getToken(): string | null {
  return localStorage.getItem('dsa-tutor-token')
}
