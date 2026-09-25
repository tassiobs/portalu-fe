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

interface Field {
  id: string
  label: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select'
  required: boolean
  order: number
  options: string[] | null
}

interface RequestType {
  id: string
  name: string
  description: string | null
  fields: Field[]
}

interface Portal {
  id: string
}

const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select'] as const

function FieldsSection({
  portal,
  rt,
  mutate,
}: {
  portal: Portal
  rt: RequestType
  mutate: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  const emptyForm = {
    label: '',
    field_type: 'text' as Field['field_type'],
    required: false,
    order: rt.fields.length,
    options: '',
  }

  const [addForm, setAddForm] = useState({ ...emptyForm })
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const sortedFields = [...rt.fields].sort((a, b) => a.order - b.order)

  function openEdit(field: Field) {
    setShowAdd(false)
    setEditingFieldId(field.id)
    setEditForm({
      label: field.label,
      field_type: field.field_type,
      required: field.required,
      order: field.order,
      options: field.options ? field.options.join(', ') : '',
    })
  }

  function cancelEdit() {
    setEditingFieldId(null)
  }

  async function saveAdd() {
    if (!addForm.label.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/org/portals/${portal.id}/request-types/${rt.id}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          label: addForm.label.trim(),
          field_type: addForm.field_type,
          required: addForm.required,
          order: addForm.order,
          options: addForm.field_type === 'select'
            ? addForm.options.split(',').map((s) => s.trim()).filter(Boolean)
            : null,
        }),
      })
      setAddForm({ ...emptyForm, order: rt.fields.length + 1 })
      setShowAdd(false)
      mutate()
      toast.success('Field added')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to add field'))
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(fieldId: string) {
    if (!editForm.label.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/org/portals/${portal.id}/request-types/${rt.id}/fields/${fieldId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: editForm.label.trim(),
          field_type: editForm.field_type,
          required: editForm.required,
          order: editForm.order,
          options: editForm.field_type === 'select'
            ? editForm.options.split(',').map((s) => s.trim()).filter(Boolean)
            : null,
        }),
      })
      setEditingFieldId(null)
      mutate()
      toast.success('Field updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update field'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteField(fieldId: string) {
    if (!confirm('Delete this field?')) return
    try {
      await apiFetch(`/org/portals/${portal.id}/request-types/${rt.id}/fields/${fieldId}`, {
        method: 'DELETE',
      })
      mutate()
      toast.success('Field deleted')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete field'))
    }
  }

  return (
    <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Fields</p>
        {!showAdd && (
          <Button variant="outline" size="sm" onClick={() => { setShowAdd(true); setEditingFieldId(null) }}>
            Add field
          </Button>
        )}
      </div>

      {sortedFields.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400">No fields yet.</p>
      )}

      {sortedFields.map((field) => (
        <div key={field.id}>
          {editingFieldId === field.id ? (
            <div className="border border-gray-200 rounded-md p-3 space-y-3">
              <FieldForm
                form={editForm}
                setForm={setEditForm}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(field.id)} disabled={saving || !editForm.label.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-gray-800">{field.label}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{field.field_type}</span>
              {field.required && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">required</span>
              )}
              <Button variant="outline" size="sm" onClick={() => openEdit(field)}>Edit</Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => deleteField(field.id)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      ))}

      {showAdd && (
        <div className="border border-gray-200 rounded-md p-3 space-y-3">
          <FieldForm form={addForm} setForm={setAddForm} />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveAdd} disabled={saving || !addForm.label.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldForm({
  form,
  setForm,
}: {
  form: {
    label: string
    field_type: Field['field_type']
    required: boolean
    order: number
    options: string
  }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
}) {
  return (
    <>
      <div className="space-y-1">
        <Label>Label</Label>
        <Input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="Field label"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={form.field_type}
            onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value as Field['field_type'] }))}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Order</Label>
          <Input
            type="number"
            value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
          />
        </div>
      </div>
      {form.field_type === 'select' && (
        <div className="space-y-1">
          <Label>Options <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
          <Input
            value={form.options}
            onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
            placeholder="Option A, Option B, Option C"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          id={`required-${form.label}`}
          type="checkbox"
          checked={form.required}
          onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
          className="h-4 w-4"
        />
        <Label htmlFor={`required-${form.label}`}>Required</Label>
      </div>
    </>
  )
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
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
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
                  </div>
                  {portal && (
                    <FieldsSection portal={portal} rt={rt} mutate={mutate} />
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
