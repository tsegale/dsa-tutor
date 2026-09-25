const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Base URL plus JSON and bearer headers, shared by apiFetch and the
 * prediction stream (which reads the body incrementally instead). */
export function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('dsa-tutor-token')
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiRequest(path, options)
  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? 'API error')
  }
  return data.data as T
}
