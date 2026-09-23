'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch, ApiError, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RequestType {
  id: string
  name: string
  description: string | null
}

export default function RequestTypesPage() {
  const { portal, isLoading: portalLoading } = usePortalAdmin()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: requestTypes, isLoading, error: rtError, mutate } = useSWR<RequestType[]>(
    portal ? `/org/portals/${portal.id}/request-types` : null,
    () => apiFetch<RequestType[]>(`/org/portals/${portal!.id}/request-types`),
  )

  function openNew() {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
    setShowForm(true)
  }

  function openEdit(rt: RequestType) {
    setShowForm(false)
    setEditingId(rt.id)
    setFormName(rt.name)
    setFormDesc(rt.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
  }

  async function save(id?: string) {
    if (!formName.trim() || !portal) return
    setSaving(true)
    try {
      if (id) {
        await apiFetch(`/org/portals/${portal.id}/request-types/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null }),
        })
        cancelEdit()
        toast.success('Request type updated')
      } else {
        await apiFetch(`/org/portals/${portal.id}/request-types`, {
          method: 'POST',
          body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null }),
        })
        setShowForm(false)
        setFormName('')
        setFormDesc('')
        toast.success('Request type created')
      }
      await mutate()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRt(id: string) {
    if (!portal || !confirm('Delete this request type?')) return
    try {
      await apiFetch(`/org/portals/${portal.id}/request-types/${id}`, { method: 'DELETE' })
      await mutate()
      toast.success('Request type deleted')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete'))
    }
  }

  if (portalLoading || isLoading) return <LoadingSpinner />
  if ((rtError as ApiError)?.status === 403) return <p className="text-sm text-gray-500 py-8 text-center">Access denied.</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Request Types</h1>
        <Button onClick={openNew} disabled={showForm}>New Request Type</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create request type</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Driver's License" autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save()} disabled={saving || !formName.trim()}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!requestTypes?.length ? (
        <p className="text-sm text-gray-400 text-center py-12">No request types yet.</p>
      ) : (
        <div className="space-y-3">
          {requestTypes.map((rt) => (
            <Card key={rt.id}>
              {editingId === rt.id ? (
                <CardContent className="pt-5 space-y-4">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => save(rt.id)} disabled={saving || !formName.trim()}>
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="pt-5 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{rt.name}</p>
                    {rt.description && <p className="text-sm text-gray-500 mt-0.5">{rt.description}</p>}
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(rt)}>Edit</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteRt(rt.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
