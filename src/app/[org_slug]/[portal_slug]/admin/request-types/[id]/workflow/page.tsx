'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { useAuth } from '@/context/AuthContext'
import { canPortal } from '@/lib/permissions'
import { apiFetch, ApiError, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface OrgRole {
  id: string
  name: string
}

interface TaskDefinition {
  id: string
  key: string
  name: string
  assignee_role: string | null
  deadline_offset_hours: number | null
  depends_on: string[]
}

interface WorkflowOut {
  id: string
  request_type_id: string
  tasks: TaskDefinition[]
  updated_at: string
}

interface TaskForm {
  name: string
  key: string
  assigneeRole: string
  deadlineDays: string
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normaliseRoles(raw: unknown): OrgRole[] {
  if (Array.isArray(raw)) return raw as OrgRole[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: OrgRole[] }).data
  return []
}

export default function WorkflowBuilderPage() {
  const { org_slug, portal_slug, id: requestTypeId } = useParams<{
    org_slug: string
    portal_slug: string
    id: string
  }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { portal, isLoading: portalLoading } = usePortalAdmin()

  const [tasks, setTasks] = useState<TaskForm[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const canView = !!user && !!portal && canPortal(user, portal.id, 'portal.workflows:view')
  const canManage = !!user && !!portal && canPortal(user, portal.id, 'portal.workflows:manage')

  const { data: rawWorkflow, isLoading: workflowLoading, error: workflowError } = useSWR<WorkflowOut>(
    portal && canView ? `/org/portals/${portal.id}/request-types/${requestTypeId}/workflow` : null,
    () => apiFetch<WorkflowOut>(`/org/portals/${portal!.id}/request-types/${requestTypeId}/workflow`),
    { shouldRetryOnError: false },
  )

  const { data: rawRoles } = useSWR(
    canView ? '/org/roles' : null,
    () => apiFetch('/org/roles'),
  )

  const roles = normaliseRoles(rawRoles)

  useEffect(() => {
    if (loaded) return
    if (workflowLoading) return

    if ((workflowError as ApiError)?.status === 404 || !rawWorkflow) {
      setLoaded(true)
      return
    }

    if (rawWorkflow?.tasks) {
      setTasks(
        rawWorkflow.tasks.map((t) => ({
          name: t.name,
          key: t.key,
          assigneeRole: t.assignee_role ?? '',
          deadlineDays: t.deadline_offset_hours != null
            ? String(t.deadline_offset_hours / 24)
            : '',
        })),
      )
      setLoaded(true)
    }
  }, [rawWorkflow, workflowLoading, workflowError, loaded])

  function addTask() {
    setTasks((prev) => [...prev, { name: '', key: '', assigneeRole: '', deadlineDays: '' }])
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setTasks((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setTasks((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function updateTask(index: number, field: keyof TaskForm, value: string) {
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t
        const updated = { ...t, [field]: value }
        if (field === 'name') updated.key = toSlug(value)
        return updated
      }),
    )
  }

  async function save() {
    if (!portal) return
    setSaveError(null)
    setSaving(true)
    try {
      const payload = {
        tasks: tasks.map((t, i) => ({
          key: t.key || toSlug(t.name),
          name: t.name.trim(),
          assignee_role: t.assigneeRole || null,
          deadline_offset_hours: t.deadlineDays ? Number(t.deadlineDays) * 24 : null,
          depends_on: i === 0 ? [] : [tasks[i - 1].key || toSlug(tasks[i - 1].name)],
        })),
      }
      await apiFetch(`/org/portals/${portal.id}/request-types/${requestTypeId}/workflow`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      toast.success('Workflow saved')
    } catch (err) {
      const msg = apiErrorMessage(err, 'Failed to save workflow')
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || portalLoading) return <LoadingSpinner />
  if (!user) return null

  if (!canView) {
    return <p className="text-sm text-gray-500 py-8 text-center">Access denied.</p>
  }

  const base = `/${org_slug}/${portal_slug}/admin`

  if (workflowLoading || !loaded) return <LoadingSpinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`${base}/request-types`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Request Types
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workflow</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define the sequence of tasks for this request type.
          </p>
        </div>
        {canManage && (
          <Button onClick={save} disabled={saving || tasks.length === 0}>
            {saving ? 'Saving…' : 'Save workflow'}
          </Button>
        )}
      </div>

      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No tasks yet. Add the first step below.
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <Card key={index}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={task.name}
                        onChange={(e) => updateTask(index, 'name', e.target.value)}
                        placeholder="e.g. Legal Review"
                        disabled={!canManage}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Key <span className="text-gray-400 font-normal text-xs">(auto-generated)</span></Label>
                      <Input
                        value={task.key}
                        onChange={(e) => updateTask(index, 'key', e.target.value)}
                        placeholder="legal_review"
                        disabled={!canManage}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Assignee role</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                        value={task.assigneeRole}
                        onChange={(e) => updateTask(index, 'assigneeRole', e.target.value)}
                        disabled={!canManage}
                      >
                        <option value="">— none —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Deadline <span className="text-gray-400 font-normal text-xs">(days, optional)</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={task.deadlineDays}
                        onChange={(e) => updateTask(index, 'deadlineDays', e.target.value)}
                        placeholder="e.g. 3"
                        disabled={!canManage}
                      />
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === tasks.length - 1}
                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                        title="Move down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="h-7 w-7 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 text-xs"
                        title="Remove task"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {index > 0 && (
                  <p className="text-xs text-gray-400 pl-9">
                    Starts after: <span className="font-medium text-gray-600">{tasks[index - 1].name || '(previous task)'}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <Button variant="outline" onClick={addTask} className="w-full">
          + Add task
        </Button>
      )}

      {tasks.length > 0 && canManage && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || tasks.length === 0}>
            {saving ? 'Saving…' : 'Save workflow'}
          </Button>
        </div>
      )}
    </div>
  )
}
