'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { citizenFetch, citizenErrorMessage } from '@/lib/citizenApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function ResetPasswordContent() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(null)
    setLoading(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
      })
      router.push(`${base}/sign-in`)
    } catch (err) {
      setError(citizenErrorMessage(err, 'Reset failed. The link may have expired.'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto text-center space-y-3">
        <p className="text-sm text-gray-500">Invalid or missing reset token.</p>
        <Link href={`${base}/forgot-password`} className="text-sm text-blue-600 hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reset password</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a new password.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
