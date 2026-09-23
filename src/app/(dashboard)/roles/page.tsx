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

interface Permission { key: string; label: string; description: string }
interface Role {
  id: string
  name: string
  description: string | null
  level: 'org' | 'portal'
  is_default: boolean
  permissions: string[]
}

function normaliseArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: T[] }).data
  return []
}

function PermissionsChecklist({
  permissions,
  selected,
  onToggle,
}: {
  permissions: Permission[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = p.key.split(/[:.]/)[0]
    acc[g] = acc[g] ?? []
    acc[g].push(p)
    return acc
  }, {})

  if (!permissions.length) return <p className="text-sm text-gray-400 mt-2">Loading permissions…</p>

  return (
    <div className="space-y-4 mt-2">
      {Object.entries(grouped).map(([group, perms]) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group}</p>
          <div className="grid grid-cols-2 gap-2">
            {perms.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(p.key)}
                  onChange={() => onToggle(p.key)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700" title={p.description}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RolesPage() {
  const { user } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formLevel, setFormLevel] = useState<'org' | 'portal'>('org')
  const [formPerms, setFormPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPerms, setEditPerms] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const { data: rawRoles, isLoading, mutate } = useSWR('/org/roles', () => apiFetch('/org/roles'))
  const roles: Role[] = normaliseArray(rawRoles)
  const orgRoles = roles.filter((r) => r.level === 'org')
  const portalRoles = roles.filter((r) => r.level === 'portal')

  const { data: rawOrgPerms } = useSWR('/org/permissions', () => apiFetch('/org/permissions'))
  const orgPermissions: Permission[] = normaliseArray(rawOrgPerms)

  const { data: rawPortalPerms } = useSWR('/org/portals/permissions', () => apiFetch('/org/portals/permissions'))
  const portalPermissions: Permission[] = normaliseArray(rawPortalPerms)

  const activePermissions = formLevel === 'org' ? orgPermissions : portalPermissions

  function openNew() {
    setFormName('')
    setFormDesc('')
    setFormLevel('org')
    setFormPerms([])
    setShowForm(true)
  }

  function openEdit(role: Role) {
    setEditingId(role.id)
    setEditName(role.name)
    setEditPerms([...role.permissions])
  }

  async function saveNew() {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await apiFetch('/org/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          level: formLevel,
          ...(formDesc.trim() ? { description: formDesc.trim() } : {}),
          permissions: formPerms,
        }),
      })
      await mutate()
      setShowForm(false)
      toast.success('Role created')
    } catch (err) {
      toast.error(((err as ApiError).body as { message?: string })?.message ?? 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(role: Role) {
    if (!editName.trim()) return
    setEditSaving(true)
    try {
      await apiFetch(`/org/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), permissions: editPerms }),
      })
      await mutate()
      setEditingId(null)
      toast.success('Role updated')
    } catch (err) {
      toast.error(((err as ApiError).body as { message?: string })?.message ?? 'Failed to update')
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteRole(role: Role) {
    if (!confirm('Delete this role?')) return
    try {
      await apiFetch(`/org/roles/${role.id}`, { method: 'DELETE' })
      await mutate()
      toast.success('Role deleted')
    } catch {
      toast.error('Failed to delete role')
    }
  }

  function RoleCard({ role }: { role: Role }) {
    const isEditing = editingId === role.id
    const editPermsSource = role.level === 'org' ? orgPermissions : portalPermissions

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{role.name}</CardTitle>
              {role.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(role)}>Edit</Button>
                <Button
                  variant="outline" size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={role.is_default}
                  onClick={() => deleteRole(role)}
                >Delete</Button>
              </div>
            )}
          </div>
        </CardHeader>

        {isEditing ? (
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1">
              <Label>Role name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Permissions</Label>
              <PermissionsChecklist
                permissions={editPermsSource}
                selected={editPerms}
                onToggle={(k) => setEditPerms((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k])}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveEdit(role)} disabled={editSaving || !editName.trim()}>
                {editSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="pt-0">
            {role.permissions.length === 0 ? (
              <p className="text-sm text-gray-400">No permissions assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <PageGuard allowed={can(user, 'org.users.manage')}>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <Button onClick={openNew} disabled={showForm}>New Role</Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Create role</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Role name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Analyst" autoFocus />
                </div>
                <div className="space-y-1">
                  <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(['org', 'portal'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFormLevel(t); setFormPerms([]) }}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                        formLevel === t
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === 'org' ? 'Org role' : 'Portal role'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <PermissionsChecklist
                  permissions={activePermissions}
                  selected={formPerms}
                  onToggle={(k) => setFormPerms((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k])}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveNew} disabled={saving || !formName.trim()}>
                  {saving ? 'Creating…' : 'Create role'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? <LoadingSpinner /> : (
          <>
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Org Roles</h2>
              {orgRoles.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">No org roles.</p>
                : orgRoles.map((r) => <RoleCard key={r.id} role={r} />)}
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Portal Roles</h2>
              {portalRoles.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">No portal roles.</p>
                : portalRoles.map((r) => <RoleCard key={r.id} role={r} />)}
            </div>
          </>
        )}
      </div>
    </PageGuard>
  )
}
