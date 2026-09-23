'use client'

import useSWR from 'swr'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Request {
  id: string
  title: string
  status: string
  request_type_name: string
  citizen_email: string
  created_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function PortalOverviewPage() {
  const { portal, isLoading: portalLoading } = usePortalAdmin()

  const { data: requests, isLoading: requestsLoading } = useSWR<Request[]>(
    portal ? `/org/portals/${portal.id}/requests` : null,
    () => apiFetch<Request[]>(`/org/portals/${portal!.id}/requests`),
  )

  if (portalLoading || requestsLoading) return <LoadingSpinner />

  const counts = (requests ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const recent = (requests ?? []).slice(0, 10)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['pending', 'in_progress', 'resolved', 'rejected'] as const).map((status) => (
          <Card key={status}>
            <CardContent className="pt-5 pb-4">
              <p className="text-2xl font-bold text-gray-900">{counts[status] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{status.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No requests yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.request_type_name} · {req.citizen_email}
                    </p>
                  </div>
                  <Badge
                    className={`ml-4 text-xs ${statusColors[req.status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {req.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
