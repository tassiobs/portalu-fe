'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useCitizenAuth } from '@/context/CitizenAuthContext'
import { citizenFetch, citizenErrorMessage } from '@/lib/citizenApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RequestType {
  id: string
  name: string
  description: string | null
}

function NewRequestContent() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const { client, loading: authLoading } = useCitizenAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedType = searchParams.get('type') ?? ''

  const [selectedTypeId, setSelectedTypeId] = useState(preselectedType)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !client) router.replace(`${base}/sign-in`)
  }, [authLoading, client, router, base])

  const { data: requestTypes, isLoading } = useSWR<RequestType[]>(
    `citizen-rt-${orgSlug}-${portalSlug}`,
    () => citizenFetch<RequestType[]>(orgSlug, portalSlug, '/request-types'),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTypeId || !title.trim()) return
    setSubmitting(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/requests', {
        method: 'POST',
        body: JSON.stringify({ request_type_id: selectedTypeId, title: title.trim() }),
      })
      toast.success('Request submitted')
      router.push(`${base}/dashboard`)
    } catch (err) {
      toast.error(citizenErrorMessage(err, 'Failed to submit request'))
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !client) return <LoadingSpinner />

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New request</h1>
        <p className="text-sm text-gray-500 mt-1">Tell us what you need.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label>Service type</Label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select a service…</option>
              {(requestTypes ?? []).map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="title">Description</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your request"
              required
              autoFocus={!preselectedType}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !selectedTypeId || !title.trim()}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewRequestContent />
    </Suspense>
  )
}
