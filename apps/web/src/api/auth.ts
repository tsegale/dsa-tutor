import { apiFetch } from './client'

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
