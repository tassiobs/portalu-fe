'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { can, canAny } from '@/lib/permissions'
import { apiFetch, ApiError } from '@/lib/api'
import { PageGuard } from '@/components/PageGuard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface Request {
  id: string
  title: string
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['open', 'in_progress', 'closed', 'resolved']

export default function RequestsPage() {
  const { user } = useAuth()
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const canRead = can(user, 'requests:read')
  const canCreate = can(user, 'requests:create')
  const canUpdate = can(user, 'requests:update')
  const canDelete = can(user, 'requests:delete')

  const {
    data: requests,
    isLoading,
    mutate,
  } = useSWR<Request[]>(
    canRead ? '/org/requests' : null,
    () => apiFetch<Request[]>('/org/requests'),
  )

  async function createRequest() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await apiFetch('/org/requests', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle }),
      })
      await mutate()
      setNewTitle('')
      setShowNewForm(false)
      toast.success('Request created')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to create request' : 'Failed to create request'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  async function saveEdit(id: string) {
    try {
      await apiFetch(`/org/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle, status: editStatus }),
      })
      await mutate()
      setEditingId(null)
      toast.success('Request updated')
    } catch {
      toast.error('Failed to update request')
    }
  }

  async function deleteRequest(id: string) {
    if (!confirm('Delete this request?')) return
    try {
      await apiFetch(`/org/requests/${id}`, { method: 'DELETE' })
      await mutate()
      toast.success('Request deleted')
    } catch {
      toast.error('Failed to delete request')
    }
  }

  function openEdit(req: Request) {
    setEditingId(req.id)
    setEditTitle(req.title)
    setEditStatus(req.status)
  }

  const statusColor: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-700',
    resolved: 'bg-green-100 text-green-800',
  }

  return (
    <PageGuard allowed={canAny(user, ['requests:read', 'requests:create'])}>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Requests</h1>
          {canCreate && (
            <Button onClick={() => setShowNewForm(!showNewForm)}>New Request</Button>
          )}
        </div>

        {/* New request form */}
        {showNewForm && canCreate && (
          <div className="flex gap-3 items-center bg-white border border-gray-200 rounded-lg px-4 py-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Request title…"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createRequest()}
            />
            <Button onClick={createRequest} disabled={creating || !newTitle.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        )}

        {/* Requests table */}
        {!canRead ? (
          <p className="text-sm text-gray-500 text-center py-8">
            You don&apos;t have permission to view requests.
          </p>
        ) : isLoading ? (
          <LoadingSpinner />
        ) : !requests?.length ? (
          <p className="text-sm text-gray-500 text-center py-8">No requests found.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Title</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Created</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {editingId === req.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="max-w-xs"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{req.title}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === req.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              statusColor[req.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {editingId === req.id ? (
                              <>
                                <Button size="sm" onClick={() => saveEdit(req.id)}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                {canUpdate && (
                                  <button
                                    onClick={() => openEdit(req)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Edit"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => deleteRequest(req.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageGuard>
  )
}
