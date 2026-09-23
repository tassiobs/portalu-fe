'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrgUser {
  id: string
  name: string
  email: string
  status: string
  created_at: string
}

interface Role {
  id: string
  name: string
  level: 'org' | 'portal'
  is_default: boolean
  permissions: string[]
}

interface Portal { id: string; name: string }

interface AssignedRole {
  id: string
  name: string
  level?: 'org' | 'portal'
}

function normaliseArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: T[] }).data
  return []
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [addingRole, setAddingRole] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedPortalId, setSelectedPortalId] = useState('')

  const { data: orgUser, isLoading: userLoading } = useSWR<OrgUser>(
    `/org/users/${id}`,
    () => apiFetch<OrgUser>(`/org/users/${id}`),
  )

  const { data: assignedRoles, isLoading: rolesLoading, mutate: mutateRoles } =
    useSWR<AssignedRole[]>(`/org/users/${id}/roles`, () => apiFetch<AssignedRole[]>(`/org/users/${id}/roles`))

  const { data: rawAllRoles } = useSWR('/org/roles', () => apiFetch('/org/roles'))
  const allRoles: Role[] = normaliseArray(rawAllRoles)

  const { data: portals } = useSWR<Portal[]>('/org/portals', () => apiFetch<Portal[]>('/org/portals'))

  const assignedIds = new Set((assignedRoles ?? []).map((r) => r.id))
  const availableRoles = allRoles.filter((r) => !assignedIds.has(r.id))
  const orgRoles = availableRoles.filter((r) => r.level === 'org')
  const portalRoles = availableRoles.filter((r) => r.level === 'portal')

  const selectedRole = allRoles.find((r) => r.id === selectedRoleId)

  function openAddRole() {
    setSelectedRoleId('')
    setSelectedPortalId('')
    setAddingRole(true)
  }

  async function addRole() {
    if (!selectedRoleId) return
    try {
      if (selectedRole?.level === 'portal' && selectedPortalId) {
        await apiFetch(`/org/portals/${selectedPortalId}/users`, {
          method: 'POST',
          body: JSON.stringify({ user_id: id, role_id: selectedRoleId }),
        })
      } else {
        await apiFetch(`/org/users/${id}/roles`, {
          method: 'POST',
          body: JSON.stringify({ role_id: selectedRoleId }),
        })
      }
      await mutateRoles()
      setAddingRole(false)
      setSelectedRoleId('')
      setSelectedPortalId('')
      toast.success('Role assigned')
    } catch (err) {
      const msg = ((err as ApiError).body as { message?: string })?.message ?? 'Failed to assign role'
      toast.error(msg)
    }
  }

  async function removeRole(roleId: string) {
    try {
      await apiFetch(`/org/users/${id}/roles/${roleId}`, { method: 'DELETE' })
      await mutateRoles()
      toast.success('Role removed')
    } catch {
      toast.error('Failed to remove role')
    }
  }

  if (userLoading) return <LoadingSpinner />
  if (!orgUser) return <p className="text-gray-500">User not found.</p>

  const canAddMore = availableRoles.length > 0

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">User Details</h1>

      <Card>
        <CardHeader><CardTitle>{orgUser.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{orgUser.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Status</p>
            <Badge
              variant={orgUser.status === 'active' ? 'default' : 'secondary'}
              className={orgUser.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
            >
              {orgUser.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">Member since</p>
            <p className="text-gray-900">{new Date(orgUser.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assigned Roles</CardTitle>
            {!addingRole && canAddMore && (
              <Button size="sm" onClick={openAddRole}>Add Role</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rolesLoading ? (
            <LoadingSpinner />
          ) : !assignedRoles?.length ? (
            <p className="text-sm text-gray-500">No roles assigned.</p>
          ) : (
            <div className="space-y-2">
              {assignedRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{role.name}</Badge>
                    {role.level && (
                      <span className="text-xs text-gray-400">{role.level}</span>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => removeRole(role.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {addingRole && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => { setSelectedRoleId(e.target.value); setSelectedPortalId('') }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a role…</option>
                  {orgRoles.length > 0 && (
                    <optgroup label="Org">
                      {orgRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </optgroup>
                  )}
                  {portalRoles.length > 0 && (
                    <optgroup label="Portal">
                      {portalRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              {selectedRole?.level === 'portal' && (
                <div className="space-y-1">
                  <Label>Portal</Label>
                  <select
                    value={selectedPortalId}
                    onChange={(e) => setSelectedPortalId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select a portal…</option>
                    {(portals ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm" onClick={addRole}
                  disabled={!selectedRoleId || (selectedRole?.level === 'portal' && !selectedPortalId)}
                >
                  Assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAddingRole(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
