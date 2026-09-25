'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch, ApiError, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface FieldValue {
  field_id: string
  label: string
  field_type: string
  value: string
}

interface Request {
  id: string
  title: string
  status: string
  request_type_name: string
  citizen_email: string
  created_at: string
  field_values: FieldValue[]
}

const STATUSES = ['pending', 'in_progress', 'resolved', 'rejected']

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  in_progress: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  resolved: 'bg-green-100 text-green-800 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
}

export default function RequestsPage() {
  const { portal, isLoading: portalLoading } = usePortalAdmin()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: requests, isLoading, error: requestsError, mutate } = useSWR<Request[]>(
    portal ? `/org/portals/${portal.id}/requests` : null,
    () => apiFetch<Request[]>(`/org/portals/${portal!.id}/requests`),
  )

  async function updateStatus(requestId: string, status: string) {
    if (!portal) return
    setUpdatingId(requestId)
    try {
      await apiFetch(`/org/portals/${portal.id}/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await mutate()
      toast.success('Status updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update'))
    } finally {
      setUpdatingId(null)
    }
  }

  if (portalLoading || isLoading) return <LoadingSpinner />
  if ((requestsError as ApiError)?.status === 403) return <p className="text-sm text-gray-500 py-8 text-center">Access denied.</p>

  const filtered =
    filterStatus === 'all'
      ? (requests ?? [])
      : (requests ?? []).filter((r) => r.status === filterStatus)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Requests</h1>

      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {(requests ?? []).filter((r) => r.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No requests found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                  >
                    <p className="font-medium text-gray-900">
                      <span className="mr-1 text-gray-400 text-xs">
                        {expandedId === req.id ? '▾' : '▸'}
                      </span>
                      {req.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {req.request_type_name} · {req.citizen_email} ·{' '}
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <Badge className={`shrink-0 text-xs ${statusColors[req.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {req.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  {STATUSES.filter((s) => s !== req.status).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={updatingId === req.id}
                      onClick={() => updateStatus(req.id, s)}
                      className="text-xs"
                    >
                      Mark {s.replace('_', ' ')}
                    </Button>
                  ))}
                </div>

                {expandedId === req.id && req.field_values?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2">
                    {req.field_values.map((fv) => (
                      <div key={fv.field_id}>
                        <p className="text-xs text-gray-500">{fv.label}</p>
                        <p className="text-sm text-gray-900">
                          {fv.field_type === 'date' ? new Date(fv.value).toLocaleDateString() : fv.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
