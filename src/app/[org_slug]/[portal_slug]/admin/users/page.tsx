'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrgUser {
  id: string
  name: string
  email: string
}

interface Role {
  id: string
  name: string
  level: 'org' | 'portal'
}

function normaliseArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: T[] }).data
  return []
}

export default function PortalUsersPage() {
  const { portal, isLoading: portalLoading } = usePortalAdmin()
  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: rawOrgUsers } = useSWR('/org/users', () => apiFetch('/org/users'))
  const orgUsers: OrgUser[] = normaliseArray(rawOrgUsers)

  const { data: rawRoles } = useSWR('/org/roles', () => apiFetch('/org/roles'))
  const portalRoles: Role[] = normaliseArray<Role>(rawRoles).filter((r) => r.level === 'portal')

  async function assign() {
    if (!portal || !selectedUserId || !selectedRoleId) return
    setSaving(true)
    try {
      await apiFetch(`/org/portals/${portal.id}/users`, {
        method: 'POST',
        body: JSON.stringify({ user_id: selectedUserId, role_id: selectedRoleId }),
      })
      setShowForm(false)
      setSelectedUserId('')
      setSelectedRoleId('')
      toast.success('User assigned to portal')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to assign'))
    } finally {
      setSaving(false)
    }
  }

  if (portalLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Portal Users</h1>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
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
                {orgUsers.map((u) => (
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
                {portalRoles.map((r) => (
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

      <p className="text-sm text-gray-400 text-center py-8">
        User listing for this portal is not yet available — pending backend endpoint.
      </p>
    </div>
  )
}
