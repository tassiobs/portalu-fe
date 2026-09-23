'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { apiFetch } from '@/lib/api'

export interface Portal {
  id: string
  name: string
  slug: string
  description: string | null
  domain: string | null
}

export function usePortalAdmin() {
  const params = useParams<{ portal_slug: string }>()
  const portal_slug = decodeURIComponent(params.portal_slug ?? '')

  const { data: portals, isLoading } = useSWR<Portal[]>(
    '/org/portals',
    () => apiFetch<Portal[]>('/org/portals'),
  )

  const portal = portals ? (portals.find((p) => p.slug === portal_slug) ?? null) : undefined

  return { portal, isLoading }
}
