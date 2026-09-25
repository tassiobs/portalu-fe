'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  citizenFetch,
  setCitizenAccess,
  setCitizenRefresh,
  clearCitizenTokens,
  getCitizenRefresh,
  getCitizenAccess,
} from '@/lib/citizenApi'

export interface ClientUser {
  id: string
  name: string
  email: string
  status: string
  email_verified: boolean
}

interface CitizenAuthState {
  client: ClientUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const CitizenAuthContext = createContext<CitizenAuthState | null>(null)

export function CitizenAuthProvider({
  children,
  orgSlug,
  portalSlug,
}: {
  children: React.ReactNode
  orgSlug: string
  portalSlug: string
}) {
  const [client, setClient] = useState<ClientUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await citizenFetch<ClientUser>(orgSlug, portalSlug, '/auth/me')
      setClient(me)
    } catch {
      setClient(null)
    }
  }, [orgSlug, portalSlug])

  useEffect(() => {
    async function init() {
      const access = getCitizenAccess(orgSlug, portalSlug)
      const refreshToken = getCitizenRefresh(orgSlug, portalSlug)
      if (access || refreshToken) {
        await refresh()
      }
      setLoading(false)
    }
    init()
  }, [orgSlug, portalSlug, refresh])

  async function signIn(email: string, password: string) {
    const data = await citizenFetch<{
      access_token: string
      refresh_token: string
      citizen: ClientUser
    }>(orgSlug, portalSlug, '/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setCitizenAccess(orgSlug, portalSlug, data.access_token)
    setCitizenRefresh(orgSlug, portalSlug, data.refresh_token)
    setClient(data.citizen)
  }

  async function signOut() {
    const refreshToken = getCitizenRefresh(orgSlug, portalSlug)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/citizen/${orgSlug}/${portalSlug}/auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {}
    clearCitizenTokens(orgSlug, portalSlug)
    setClient(null)
  }

  return (
    <CitizenAuthContext.Provider value={{ client, loading, signIn, signOut, refresh }}>
      {children}
    </CitizenAuthContext.Provider>
  )
}

export function useCitizenAuth() {
  const ctx = useContext(CitizenAuthContext)
  if (!ctx) throw new Error('useCitizenAuth must be used inside CitizenAuthProvider')
  return ctx
}
