'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { citizenFetch } from '@/lib/citizenApi'
import { useCitizenAuth } from '@/context/CitizenAuthContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface RequestType {
  id: string
  name: string
  description: string | null
}

export default function ClientPortalLandingPage() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const { client, loading: authLoading } = useCitizenAuth()

  const { data: requestTypes, isLoading } = useSWR<RequestType[]>(
    `citizen-rt-${orgSlug}-${portalSlug}`,
    () => citizenFetch<RequestType[]>(orgSlug, portalSlug, '/request-types'),
  )

  return (
    <div className="space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 capitalize">
          {portalSlug.replace(/-/g, ' ')}
        </h1>
        <p className="text-gray-500 text-sm">Submit and track your requests online.</p>

        {!authLoading && (
          <div className="flex gap-3 justify-center pt-2">
            {client ? (
              <Button asChild>
                <Link href={`${base}/dashboard`}>My requests</Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link href={`${base}/sign-in`}>Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`${base}/sign-up`}>Create account</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">What can we help you with?</h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : !requestTypes?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No services available yet.</p>
        ) : (
          <div className="grid gap-3">
            {requestTypes.map((rt) => (
              <Card key={rt.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{rt.name}</p>
                    {rt.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{rt.description}</p>
                    )}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={client ? `${base}/requests/new?type=${rt.id}` : `${base}/sign-in`}>
                      Request
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
