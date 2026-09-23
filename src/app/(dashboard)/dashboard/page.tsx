'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { apiFetch, ApiError } from '@/lib/api'
import { useOrg } from '@/hooks/useOrg'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Portal {
  id: string
  name: string
  slug: string
  description: string | null
  domain: string | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { org } = useOrg()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: portals, isLoading, mutate } = useSWR<Portal[]>(
    '/org/portals',
    () => apiFetch<Portal[]>('/org/portals'),
  )

  async function createPortal() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await apiFetch('/org/portals', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(domain.trim() ? { domain: domain.trim() } : {}),
        }),
      })
      await mutate()
      setShowForm(false)
      setName('')
      setDescription('')
      setDomain('')
      toast.success('Portal created')
    } catch (err) {
      const msg = ((err as ApiError).body as { message?: string })?.message ?? 'Failed to create portal'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const canManage = can(user, 'org.portals.manage')

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your organization&apos;s portals</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            New Portal
          </Button>
        )}
      </div>

      {/* Create portal form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Public Services"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this portal"
              />
            </div>
            <div className="space-y-1">
              <Label>Domain <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. portal.myorg.gov"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createPortal} disabled={saving || !name.trim()}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portals list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !portals?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No portals yet.</p>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Create your first portal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              href={`/${org?.slug}/${portal.slug}/admin`}
              className="block group"
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
                    {portal.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portal.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{portal.description}</p>
                  )}
                  {portal.domain && (
                    <p className="text-xs text-gray-400 mt-2">{portal.domain}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
