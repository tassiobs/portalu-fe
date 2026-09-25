const BASE = process.env.NEXT_PUBLIC_API_URL!

function aKey(org: string, portal: string) { return `c_a_${org}_${portal}` }
function rKey(org: string, portal: string) { return `c_r_${org}_${portal}` }

export function getCitizenAccess(org: string, portal: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(aKey(org, portal))
}
export function setCitizenAccess(org: string, portal: string, token: string) {
  localStorage.setItem(aKey(org, portal), token)
}
export function getCitizenRefresh(org: string, portal: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(rKey(org, portal))
}
export function setCitizenRefresh(org: string, portal: string, token: string) {
  localStorage.setItem(rKey(org, portal), token)
}
export function clearCitizenTokens(org: string, portal: string) {
  localStorage.removeItem(aKey(org, portal))
  localStorage.removeItem(rKey(org, portal))
}

export class CitizenApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`)
  }
}

export function citizenErrorMessage(err: unknown, fallback: string): string {
  const e = err as CitizenApiError
  if (e?.status === 403) return 'Please verify your email before signing in.'
  if (e?.status === 423) return (e.body as { detail?: string })?.detail ?? 'Account locked. Try again later.'
  return (e?.body as { detail?: string; message?: string })?.detail
    || (e?.body as { message?: string })?.message
    || fallback
}

async function tryRefreshCitizen(org: string, portal: string): Promise<boolean> {
  const refresh = getCitizenRefresh(org, portal)
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/citizen/${org}/${portal}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) {
      if (res.status < 500) clearCitizenTokens(org, portal)
      return false
    }
    const data = await res.json()
    setCitizenAccess(org, portal, data.access_token)
    if (data.refresh_token) setCitizenRefresh(org, portal, data.refresh_token)
    return true
  } catch {
    return false
  }
}

export async function citizenFetch<T = unknown>(
  org: string,
  portal: string,
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getCitizenAccess(org, portal)
  const res = await fetch(`${BASE}/citizen/${org}/${portal}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && retry) {
    const ok = await tryRefreshCitizen(org, portal)
    if (ok) return citizenFetch(org, portal, path, options, false)
    if (typeof window !== 'undefined') window.location.href = `/${org}/${portal}/sign-in`
    throw new CitizenApiError(401, null)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new CitizenApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
