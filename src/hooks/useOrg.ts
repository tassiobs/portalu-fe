'use client'

import useSWR from 'swr'
import { apiFetch } from '@/lib/api'

export interface Org {
  id: string
  name: string
  slug: string
}

export function useOrg() {
  const { data: org, isLoading } = useSWR<Org>(
    '/org',
    () => apiFetch<Org>('/org'),
  )
  return { org, isLoading }
}
