'use client'

import { useState } from 'react'
import { use } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  is_default: boolean
  permissions: string[]
}

interface AssignedRole {
  id: string
  name: string
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [addingRole, setAddingRole] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const { data: orgUser, isLoading: userLoading } = useSWR<OrgUser>(
    `/org/users/${id}`,
    () => apiFetch<OrgUser>(`/org/users/${id}`),
  )

  const {
    data: assignedRoles,
    isLoading: rolesLoading,
    mutate: mutateRoles,
  } = useSWR<AssignedRole[]>(`/org/users/${id}/roles`, () => apiFetch<AssignedRole[]>(`/org/users/${id}/roles`))

  const { data: allRoles } = useSWR<Role[]>('/org/roles', () => apiFetch<Role[]>('/org/roles'))

  const availableRoles = allRoles?.filter(
    (r) => !assignedRoles?.some((ar) => ar.id === r.id),
  )

  async function removeRole(roleId: string) {
    try {
      await apiFetch(`/org/users/${id}/roles/${roleId}`, { method: 'DELETE' })
      await mutateRoles()
      toast.success('Role removed')
    } catch {
      toast.error('Failed to remove role')
    }
  }

  async function addRole() {
    if (!selectedRoleId) return
    try {
      await apiFetch(`/org/users/${id}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role_id: selectedRoleId }),
      })
      await mutateRoles()
      setSelectedRoleId('')
      setAddingRole(false)
      toast.success('Role assigned')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to assign role' : 'Failed to assign role'
      toast.error(msg)
    }
  }

  if (userLoading) return <LoadingSpinner />
  if (!orgUser) return <p className="text-gray-500">User not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">User Details</h1>

      <Card>
        <CardHeader>
          <CardTitle>{orgUser.name}</CardTitle>
        </CardHeader>
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
            {!addingRole && availableRoles && availableRoles.length > 0 && (
              <Button size="sm" onClick={() => setAddingRole(true)}>
                Add Role
              </Button>
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
                <div
                  key={role.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <Badge variant="outline">{role.name}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
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
            <div className="flex gap-2 items-center pt-2 border-t border-gray-100">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a role…</option>
                {availableRoles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={addRole} disabled={!selectedRoleId}>
                Assign
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddingRole(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
