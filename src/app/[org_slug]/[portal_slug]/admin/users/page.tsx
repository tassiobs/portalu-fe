'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PortalUser {
  user_id: string
  name: string
  email: string
  role_id: string
  role_name: string
}

interface OrgUser {
  id: string
  name: string
  email: string
}

interface PortalRole {
  id: string
  name: string
}

export default function PortalUsersPage() {
  const { portal, isLoading: portalLoading } = usePortalAdmin()
  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: portalUsers, isLoading: usersLoading, mutate } = useSWR<PortalUser[]>(
    portal ? `/org/portals/${portal.id}/users` : null,
    () => apiFetch<PortalUser[]>(`/org/portals/${portal!.id}/users`),
  )

  const { data: rawOrgUsers } = useSWR(
    '/org/users',
    () => apiFetch('/org/users'),
  )
  const orgUsers: OrgUser[] = Array.isArray(rawOrgUsers)
    ? rawOrgUsers
    : Array.isArray((rawOrgUsers as { data?: unknown })?.data)
      ? (rawOrgUsers as { data: OrgUser[] }).data
      : []

  const { data: portalRoles } = useSWR<PortalRole[]>(
    portal ? `/org/portals/${portal.id}/roles` : null,
    () => apiFetch<PortalRole[]>(`/org/portals/${portal!.id}/roles`),
  )

  const assignedUserIds = new Set((portalUsers ?? []).map((u) => u.user_id))
  const availableOrgUsers = (orgUsers ?? []).filter((u) => !assignedUserIds.has(u.id))

  async function assign() {
    if (!portal || !selectedUserId || !selectedRoleId) return
    setSaving(true)
    try {
      await apiFetch(`/org/portals/${portal.id}/users`, {
        method: 'POST',
        body: JSON.stringify({ user_id: selectedUserId, role_id: selectedRoleId }),
      })
      await mutate()
      setShowForm(false)
      setSelectedUserId('')
      setSelectedRoleId('')
      toast.success('User assigned to portal')
    } catch (err) {
      const msg = ((err as ApiError).body as { message?: string })?.message ?? 'Failed to assign'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function removeUser(userId: string) {
    if (!portal || !confirm('Remove this user from the portal?')) return
    try {
      await apiFetch(`/org/portals/${portal.id}/users/${userId}`, { method: 'DELETE' })
      await mutate()
      toast.success('User removed')
    } catch {
      toast.error('Failed to remove user')
    }
  }

  if (portalLoading || usersLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Portal Users</h1>
        <Button onClick={() => setShowForm(true)} disabled={showForm || availableOrgUsers.length === 0}>
          Assign User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Assign user to portal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>User</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a user…</option>
                {availableOrgUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a role…</option>
                {(portalRoles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={assign} disabled={saving || !selectedUserId || !selectedRoleId}>
                {saving ? 'Assigning…' : 'Assign'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!portalUsers?.length ? (
        <p className="text-sm text-gray-400 text-center py-12">No users assigned to this portal yet.</p>
      ) : (
        <div className="space-y-3">
          {portalUsers.map((u) => (
            <Card key={u.user_id}>
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email} · {u.role_name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removeUser(u.user_id)}
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
