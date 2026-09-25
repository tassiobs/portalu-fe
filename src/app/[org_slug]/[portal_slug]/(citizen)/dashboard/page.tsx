'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useCitizenAuth } from '@/context/CitizenAuthContext'
import { citizenFetch } from '@/lib/citizenApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ClientRequest {
  id: string
  title: string
  status: string
  request_type_name: string
  created_at: string
}

export default function ClientDashboardPage() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const { client, loading: authLoading } = useCitizenAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !client) router.replace(`${base}/sign-in`)
  }, [authLoading, client, router, base])

  const { data: requests, isLoading } = useSWR<ClientRequest[]>(
    client ? `citizen-requests-${orgSlug}-${portalSlug}` : null,
    () => citizenFetch<ClientRequest[]>(orgSlug, portalSlug, '/requests'),
  )

  if (authLoading || !client) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
        </div>
        <Button asChild>
          <Link href={`${base}/requests/new`}>New request</Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !requests?.length ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-gray-400">You haven&apos;t submitted any requests yet.</p>
          <Button asChild variant="outline">
            <Link href={`${base}/requests/new`}>Submit your first request</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link key={req.id} href={`${base}/requests/${req.id}`} className="block group">
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {req.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.request_type_name} · {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {req.status.replace(/_/g, ' ')}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
