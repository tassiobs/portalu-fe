'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { apiFetch, ApiError, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  id: string          // assignment record ID — used for DELETE
  role_id: string     // role definition ID — used to filter available roles
  name: string
  level: 'org' | 'portal'
  portal_id: string | null
  portal_name: string | null
}

function normaliseArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: T[] }).data
  return []
}

const USER_STATUSES = ['active', 'inactive', 'suspended']

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingRole, setAddingRole] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedPortalId, setSelectedPortalId] = useState('')

  const { data: orgUser, isLoading: userLoading, mutate: mutateUser } = useSWR<OrgUser>(
    `/org/users/${id}`,
    () => apiFetch<OrgUser>(`/org/users/${id}`),
  )

  const { data: assignedRoles, isLoading: rolesLoading, mutate: mutateRoles } =
    useSWR<AssignedRole[]>(`/org/users/${id}/roles`, () => apiFetch<AssignedRole[]>(`/org/users/${id}/roles`))

  const { data: rawAllRoles } = useSWR('/org/roles', () => apiFetch('/org/roles'))
  const allRoles: Role[] = normaliseArray(rawAllRoles)

  const { data: portals } = useSWR<Portal[]>('/org/portals', () => apiFetch<Portal[]>('/org/portals'))

  const assignedIds = new Set((assignedRoles ?? []).map((r) => r.role_id ?? r.id))
  const availableRoles = allRoles.filter((r) => !assignedIds.has(r.id))
  const orgRoles = availableRoles.filter((r) => r.level === 'org')
  const portalRoles = availableRoles.filter((r) => r.level === 'portal')

  const selectedRole = allRoles.find((r) => r.id === selectedRoleId)

  function openEdit() {
    setEditName(orgUser?.name ?? '')
    setEditStatus(orgUser?.status ?? 'active')
    setEditing(true)
  }

  async function saveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/org/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), status: editStatus }),
      })
      await mutateUser()
      setEditing(false)
      toast.success('User updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update user'))
    } finally {
      setSaving(false)
    }
  }

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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{orgUser.name}</CardTitle>
            {!editing && <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {USER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveEdit} disabled={saving || !editName.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{role.name}</Badge>
                    <span className="text-xs text-gray-400">{role.level}</span>
                    {role.portal_name && (
                      <span className="text-xs text-gray-500">· {role.portal_name}</span>
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
