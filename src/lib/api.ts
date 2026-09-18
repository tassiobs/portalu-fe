import { getAccessToken, setAccessToken, getRefreshToken, clearTokens } from './tokens'

const BASE = process.env.NEXT_PUBLIC_API_URL!

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) { clearTokens(); return false }
    const data = await res.json()
    setAccessToken(data.access_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`)
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && retry) {
    const ok = await tryRefresh()
    if (ok) return apiFetch(path, options, false)
    if (typeof window !== 'undefined') window.location.href = '/sign-in'
    throw new ApiError(401, null)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
