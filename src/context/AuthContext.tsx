'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { rehydrate, getMe, signOut as authSignOut } from '@/lib/auth'
import type { CurrentUser } from '@/lib/permissions'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const ok = await rehydrate()
      if (ok) await refresh()
      setLoading(false)
    }
    init()
  }, [refresh])

  async function signOut() {
    await authSignOut()
    setUser(null)
    window.location.href = '/sign-in'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
