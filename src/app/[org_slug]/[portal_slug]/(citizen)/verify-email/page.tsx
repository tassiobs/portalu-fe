'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { citizenFetch, citizenErrorMessage } from '@/lib/citizenApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function VerifyEmailContent() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const router = useRouter()

  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() }),
      })
      router.push(`${base}/sign-in`)
    } catch (err) {
      setError(citizenErrorMessage(err, 'Verification failed. Please check the code and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
        <p className="text-sm text-gray-500 mt-1">
          We sent a verification link to{email ? ` ${email}` : ' your email'}.
          Enter the token below to verify your account.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="token">Verification token</Label>
          <Input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token from email"
            required
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
          {loading ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500">
        Already verified?{' '}
        <Link href={`${base}/sign-in`} className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
