'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { apiFetch, ApiError } from '@/lib/api'
import { PageGuard } from '@/components/PageGuard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Permission {
  slug: string
  description: string
}

interface Role {
  id: string
  name: string
  is_default: boolean
  permissions: string[]
}

export default function RolesPage() {
  const { user } = useAuth()
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPerms, setFormPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const {
    data: roles,
    isLoading: rolesLoading,
    mutate: mutateRoles,
  } = useSWR<Role[]>('/org/roles', () => apiFetch<Role[]>('/org/roles'))

  const { data: permissions } = useSWR<Permission[]>('/org/permissions', () =>
    apiFetch<Permission[]>('/org/permissions'),
  )

  function openNew() {
    setEditingId(null)
    setFormName('')
    setFormPerms([])
    setShowNewForm(true)
  }

  function openEdit(role: Role) {
    setShowNewForm(false)
    setEditingId(role.id)
    setFormName(role.name)
    setFormPerms([...role.permissions])
  }

  function togglePerm(slug: string) {
    setFormPerms((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug],
    )
  }

  async function saveNew() {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await apiFetch('/org/roles', {
        method: 'POST',
        body: JSON.stringify({ name: formName, permissions: formPerms }),
      })
      await mutateRoles()
      setShowNewForm(false)
      toast.success('Role created')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to create role' : 'Failed to create role'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(id: string) {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/org/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: formName, permissions: formPerms }),
      })
      await mutateRoles()
      setEditingId(null)
      toast.success('Role updated')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to update role' : 'Failed to update role'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function deleteRole(id: string) {
    if (!confirm('Delete this role?')) return
    try {
      await apiFetch(`/org/roles/${id}`, { method: 'DELETE' })
      await mutateRoles()
      toast.success('Role deleted')
    } catch {
      toast.error('Failed to delete role')
    }
  }

  const PermissionsChecklist = ({
    selected,
    onToggle,
  }: {
    selected: string[]
    onToggle: (slug: string) => void
  }) => (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {permissions?.map((p) => (
        <label key={p.slug} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(p.slug)}
            onChange={() => onToggle(p.slug)}
            className="rounded border-gray-300"
          />
          <span className="text-gray-700" title={p.description}>
            {p.slug}
          </span>
        </label>
      ))}
    </div>
  )

  return (
    <PageGuard allowed={can(user, 'org.users.manage')}>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <Button onClick={openNew}>New Role</Button>
        </div>

        {/* New role form */}
        {showNewForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create new role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Role name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Manager"
                  autoFocus
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <PermissionsChecklist selected={formPerms} onToggle={togglePerm} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveNew} disabled={saving || !formName.trim()}>
                  {saving ? 'Creating…' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roles list */}
        {rolesLoading ? (
          <LoadingSpinner />
        ) : !roles?.length ? (
          <p className="text-sm text-gray-500 text-center py-8">No roles found.</p>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{role.name}</CardTitle>
                      {role.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => (editingId === role.id ? setEditingId(null) : openEdit(role))}
                      >
                        {editingId === role.id ? 'Cancel' : 'Edit'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={role.is_default}
                        title={role.is_default ? 'Cannot delete default role' : undefined}
                        onClick={() => deleteRole(role.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {editingId === role.id ? (
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-1">
                      <Label>Role name</Label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <PermissionsChecklist selected={formPerms} onToggle={togglePerm} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(role.id)} disabled={saving || !formName.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0">
                    {role.permissions.length === 0 ? (
                      <p className="text-sm text-gray-400">No permissions assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageGuard>
  )
}
