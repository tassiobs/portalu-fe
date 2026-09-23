'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { apiFetch, apiErrorMessage } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mutate as globalMutate } from 'swr'

export default function PortalSettingsPage() {
  const { portal, isLoading } = usePortalAdmin()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (portal) {
      setName(portal.name)
      setDescription(portal.description ?? '')
      setDomain(portal.domain ?? '')
    }
  }, [portal])

  async function save() {
    if (!portal || !name.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/org/portals/${portal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          domain: domain.trim() || null,
        }),
      })
      await globalMutate('/org/portals')
      toast.success('Portal updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  async function deletePortal() {
    if (!portal || !confirm(`Delete "${portal.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await apiFetch(`/org/portals/${portal.id}`, { method: 'DELETE' })
      await globalMutate('/org/portals')
      toast.success('Portal deleted')
      router.push('/dashboard')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete'))
      setDeleting(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Portal Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="space-y-1">
            <Label>Domain <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. portal.myorg.gov" />
          </div>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-red-600">Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Deleting this portal will remove all request types and requests associated with it. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={deletePortal}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete portal'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
