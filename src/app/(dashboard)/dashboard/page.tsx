'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface Session {
  id: string
  user_agent: string
  ip_address: string
  expires_at: string
}

export default function DashboardPage() {
  const { user, refresh } = useAuth()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const {
    data: sessions,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useSWR<Session[]>('/auth/sessions', () => apiFetch<Session[]>('/auth/sessions'))

  async function saveName() {
    setSavingName(true)
    try {
      await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: nameValue }) })
      await refresh()
      setEditingName(false)
      toast.success('Name updated')
    } catch (err) {
      toast.error((err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to update name' : 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  async function revokeSession(id: string) {
    try {
      await apiFetch(`/auth/sessions/${id}`, { method: 'DELETE' })
      await mutateSessions()
      toast.success('Session revoked')
    } catch {
      toast.error('Failed to revoke session')
    }
  }

  async function revokeAllSessions() {
    try {
      await apiFetch('/auth/sessions', { method: 'DELETE' })
      await mutateSessions()
      toast.success('All other sessions revoked')
    } catch {
      toast.error('Failed to revoke sessions')
    }
  }

  if (!user) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name with inline edit */}
          <div className="flex items-center gap-3">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="max-w-xs"
                  autoFocus
                />
                <Button size="sm" onClick={saveName} disabled={savingName}>
                  {savingName ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingName(false)
                    setNameValue(user.name)
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-gray-900">{user.name}</span>
                <button
                  onClick={() => {
                    setNameValue(user.name)
                    setEditingName(true)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit name"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{user.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Status</p>
            <Badge
              variant={user.status === 'active' ? 'default' : 'secondary'}
              className={user.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
            >
              {user.status}
            </Badge>
          </div>

          {user.org_roles.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Roles</p>
              <div className="flex flex-wrap gap-2">
                {user.org_roles.map((role) => (
                  <Badge key={role.id} variant="outline">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Sessions</CardTitle>
            <Button variant="outline" size="sm" onClick={revokeAllSessions}>
              Revoke all other sessions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <LoadingSpinner />
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate max-w-sm" title={session.user_agent}>
                      {session.user_agent?.substring(0, 80) || 'Unknown device'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.ip_address} &middot; Expires{' '}
                      {new Date(session.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => revokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
