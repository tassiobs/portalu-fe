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

interface Field {
  id: string
  label: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select'
  required: boolean
  order: number
  options: string[] | null
}

interface RequestType {
  id: string
  name: string
  description: string | null
  fields: Field[]
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: Field
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label>
        {field.label}
        {field.required && ' *'}
      </Label>
      {field.field_type === 'textarea' ? (
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      ) : field.field_type === 'select' ? (
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <Input
          type={field.field_type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )}
    </div>
  )
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
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!authLoading && !client) router.replace(`${base}/sign-in`)
  }, [authLoading, client, router, base])

  useEffect(() => {
    setFieldValues({})
  }, [selectedTypeId])

  const { data: requestTypes, isLoading } = useSWR<RequestType[]>(
    `citizen-rt-${orgSlug}-${portalSlug}`,
    () => citizenFetch<RequestType[]>(orgSlug, portalSlug, '/request-types'),
  )

  const selectedType = (requestTypes ?? []).find((rt) => rt.id === selectedTypeId)
  const sortedFields = selectedType
    ? [...selectedType.fields].sort((a, b) => a.order - b.order)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTypeId || !title.trim()) return
    setSubmitting(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type_id: selectedTypeId,
          title: title.trim(),
          field_values: Object.entries(fieldValues).map(([field_id, value]) => ({ field_id, value })),
        }),
      })
      toast.success('Request submitted')
      router.push(`${base}/dashboard`)
    } catch (err) {
      toast.error(citizenErrorMessage(err, 'Please fill in all required fields.'))
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

          {sortedFields.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              value={fieldValues[field.id] ?? ''}
              onChange={(val) => setFieldValues((prev) => ({ ...prev, [field.id]: val }))}
            />
          ))}

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
