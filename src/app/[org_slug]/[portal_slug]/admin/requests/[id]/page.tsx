'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { useAuth } from '@/context/AuthContext'
import { canPortal } from '@/lib/permissions'
import { apiFetch, ApiError, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface FieldValue {
  field_id: string
  label: string
  value: string
}

interface RequestDetail {
  id: string
  title: string
  status: string
  request_type: { id: string; name: string }
  field_values: FieldValue[]
  created_at: string
  citizen_email?: string
}

interface TaskDefinition {
  id: string
  key: string
  name: string
  assignee_role: string | null
}

interface TaskInstance {
  id: string
  request_id: string
  task_definition: TaskDefinition
  status: 'waiting' | 'active' | 'completed' | 'skipped'
  outcome: 'approved' | 'rejected' | 'clarification_requested' | null
  assigned_to_user_id: string | null
  activated_at: string | null
  deadline: string | null
  completed_at: string | null
  completion_notes: string | null
}

interface OrgUser {
  id: string
  name: string
  email: string
}

const statusColors: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending_clarification: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  // legacy list statuses
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
}

const taskStatusColors: Record<string, string> = {
  waiting: 'bg-gray-100 text-gray-500',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-400',
}

const outcomeColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  clarification_requested: 'bg-orange-100 text-orange-700',
}

const outcomeLabels: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  clarification_requested: 'Clarification requested',
}

function normaliseUsers(raw: unknown): OrgUser[] {
  if (Array.isArray(raw)) return raw as OrgUser[]
  if (raw && Array.isArray((raw as { data?: unknown }).data)) return (raw as { data: OrgUser[] }).data
  return []
}

function CompleteTaskModal({
  task,
  portalId,
  requestId,
  onDone,
  onClose,
}: {
  task: TaskInstance
  portalId: string
  requestId: string
  onDone: () => void
  onClose: () => void
}) {
  const [outcome, setOutcome] = useState<'approved' | 'rejected' | 'clarification_requested'>('approved')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await apiFetch(`/org/portals/${portalId}/requests/${requestId}/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ outcome, notes: notes.trim() || undefined }),
      })
      toast.success('Task completed')
      onDone()
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to complete task'))
    } finally {
      setSubmitting(false)
    }
  }

  const outcomeConsequences: Record<string, string> = {
    approved: 'The next task in the workflow will activate automatically.',
    rejected: 'All remaining tasks will be skipped and the request will move to rejected.',
    clarification_requested: 'The workflow will pause and the request will move to pending clarification.',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Complete — {task.task_definition.name}</h2>

        <div className="space-y-2">
          <Label>Outcome</Label>
          <div className="space-y-2">
            {(['approved', 'rejected', 'clarification_requested'] as const).map((o) => (
              <label key={o} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value={o}
                  checked={outcome === o}
                  onChange={() => setOutcome(o)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-800">{outcomeLabels[o]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          {outcomeConsequences[outcome]}
        </div>

        <div className="space-y-1">
          <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any relevant notes…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReassignModal({
  task,
  portalId,
  requestId,
  users,
  onDone,
  onClose,
}: {
  task: TaskInstance
  portalId: string
  requestId: string
  users: OrgUser[]
  onDone: () => void
  onClose: () => void
}) {
  const [userId, setUserId] = useState(task.assigned_to_user_id ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await apiFetch(`/org/portals/${portalId}/requests/${requestId}/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to_user_id: userId || null }),
      })
      toast.success('Task reassigned')
      onDone()
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reassign task'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Reassign — {task.task_definition.name}</h2>

        <div className="space-y-1">
          <Label>Assign to</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">— unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Reassign'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function RequestDetailPage() {
  const { org_slug, portal_slug, id: requestId } = useParams<{
    org_slug: string
    portal_slug: string
    id: string
  }>()
  const { user, loading: authLoading } = useAuth()
  const { portal, isLoading: portalLoading } = usePortalAdmin()

  const [completingTask, setCompletingTask] = useState<TaskInstance | null>(null)
  const [reassigningTask, setReassigningTask] = useState<TaskInstance | null>(null)

  const canUpdate = !!user && !!portal && canPortal(user, portal.id, 'portal.requests:update')

  const { data: request, isLoading: requestLoading, error: requestError } = useSWR<RequestDetail>(
    portal ? `/org/portals/${portal.id}/requests/${requestId}` : null,
    () => apiFetch<RequestDetail>(`/org/portals/${portal!.id}/requests/${requestId}`),
  )

  const { data: tasks, isLoading: tasksLoading, mutate: mutateTasks } = useSWR<TaskInstance[]>(
    portal ? `/org/portals/${portal.id}/requests/${requestId}/tasks` : null,
    () => apiFetch<TaskInstance[]>(`/org/portals/${portal!.id}/requests/${requestId}/tasks`),
  )

  const { data: rawUsers } = useSWR(
    canUpdate ? '/org/users' : null,
    () => apiFetch('/org/users'),
  )
  const users = normaliseUsers(rawUsers)

  if (authLoading || portalLoading) return <LoadingSpinner />
  if (!user) return null

  if ((requestError as ApiError)?.status === 403) {
    return <p className="text-sm text-gray-500 py-8 text-center">Access denied.</p>
  }
  if ((requestError as ApiError)?.status === 404) {
    return <p className="text-sm text-gray-500 py-8 text-center">Request not found.</p>
  }

  if (requestLoading || !request) return <LoadingSpinner />

  const base = `/${org_slug}/${portal_slug}/admin`

  function isOverdue(deadline: string | null): boolean {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  return (
    <div className="max-w-3xl space-y-6">
      {completingTask && portal && (
        <CompleteTaskModal
          task={completingTask}
          portalId={portal.id}
          requestId={requestId}
          onDone={() => mutateTasks()}
          onClose={() => setCompletingTask(null)}
        />
      )}
      {reassigningTask && portal && (
        <ReassignModal
          task={reassigningTask}
          portalId={portal.id}
          requestId={requestId}
          users={users}
          onDone={() => mutateTasks()}
          onClose={() => setReassigningTask(null)}
        />
      )}

      <Link
        href={`${base}/requests`}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Requests
      </Link>

      {/* Request header */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{request.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {request.request_type.name}
                {request.citizen_email && <> · {request.citizen_email}</>}
                {' · '}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className={`shrink-0 text-xs ${statusColors[request.status] ?? 'bg-gray-100 text-gray-700'} hover:${statusColors[request.status] ?? 'bg-gray-100'}`}>
              {request.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {request.field_values?.length > 0 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-gray-100">
              {request.field_values.map((fv) => (
                <div key={fv.field_id}>
                  <p className="text-xs text-gray-500">{fv.label}</p>
                  <p className="text-sm text-gray-900">{fv.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Tasks</h2>

        {tasksLoading ? (
          <LoadingSpinner />
        ) : !tasks?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No tasks configured for this request type.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <Card key={task.id} className={task.status === 'waiting' || task.status === 'skipped' ? 'opacity-60' : ''}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{task.task_definition.name}</span>
                        <Badge className={`text-xs ${taskStatusColors[task.status]} hover:${taskStatusColors[task.status]}`}>
                          {task.status}
                        </Badge>
                        {task.outcome && (
                          <Badge className={`text-xs ${outcomeColors[task.outcome]} hover:${outcomeColors[task.outcome]}`}>
                            {outcomeLabels[task.outcome]}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                        {task.task_definition.assignee_role && (
                          <span>Role: <span className="text-gray-700">{task.task_definition.assignee_role}</span></span>
                        )}
                        {task.assigned_to_user_id && (
                          <span>Assigned to: <span className="text-gray-700">{
                            users.find(u => u.id === task.assigned_to_user_id)?.name ?? task.assigned_to_user_id
                          }</span></span>
                        )}
                        {task.deadline && (
                          <span className={isOverdue(task.deadline) && task.status === 'active' ? 'text-red-600 font-medium' : ''}>
                            Due: {new Date(task.deadline).toLocaleDateString()}
                            {isOverdue(task.deadline) && task.status === 'active' && ' · overdue'}
                          </span>
                        )}
                        {task.completed_at && (
                          <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {task.completion_notes && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">{task.completion_notes}</p>
                      )}
                    </div>

                    {canUpdate && task.status === 'active' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setReassigningTask(task)}
                        >
                          Reassign
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => setCompletingTask(task)}
                        >
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
