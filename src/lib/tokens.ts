const REFRESH_KEY = 'portalu_refresh_token'

let accessToken: string | null = null

export function getAccessToken() { return accessToken }
export function setAccessToken(token: string | null) { accessToken = token }

export function getRefreshToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(REFRESH_KEY, token)
  else localStorage.removeItem(REFRESH_KEY)
}

export function clearTokens() {
  accessToken = null
  setRefreshToken(null)
}
