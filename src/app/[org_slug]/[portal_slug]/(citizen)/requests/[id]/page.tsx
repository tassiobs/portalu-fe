'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useCitizenAuth } from '@/context/CitizenAuthContext'
import { citizenFetch } from '@/lib/citizenApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ClientRequest {
  id: string
  title: string
  status: string
  request_type_name: string
  created_at: string
}

export default function RequestDetailPage() {
  const { org_slug, portal_slug, id } = useParams<{ org_slug: string; portal_slug: string; id: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const { client, loading: authLoading } = useCitizenAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !client) router.replace(`${base}/sign-in`)
  }, [authLoading, client, router, base])

  const { data: request, isLoading } = useSWR<ClientRequest>(
    client && id ? `citizen-request-${orgSlug}-${portalSlug}-${id}` : null,
    () => citizenFetch<ClientRequest>(orgSlug, portalSlug, `/requests/${id}`),
  )

  if (authLoading || !client || isLoading) return <LoadingSpinner />
  if (!request) return <p className="text-sm text-gray-500">Request not found.</p>

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`${base}/dashboard`}>← My requests</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{request.title}</CardTitle>
            <Badge variant="outline" className="text-xs shrink-0 capitalize">
              {request.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500">Service type</p>
            <p className="text-gray-900">{request.request_type_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Submitted</p>
            <p className="text-gray-900">{new Date(request.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
