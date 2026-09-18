import { apiFetch } from './api'
import { setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from './tokens'
import type { CurrentUser } from './permissions'

export async function signIn(email: string, password: string) {
  const data = await apiFetch<{ access_token: string; refresh_token: string }>(
    '/auth/sign-in',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  )
  setAccessToken(data.access_token)
  setRefreshToken(data.refresh_token)
  return data
}

export async function signOut() {
  try { await apiFetch('/auth/sign-out', { method: 'POST' }) } catch {}
  clearTokens()
}

export async function rehydrate(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const data = await apiFetch<{ access_token: string }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) },
      false,
    )
    setAccessToken(data.access_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/auth/me')
}
