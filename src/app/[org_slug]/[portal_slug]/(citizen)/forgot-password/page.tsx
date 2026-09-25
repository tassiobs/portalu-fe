'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { citizenFetch, citizenErrorMessage } from '@/lib/citizenApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch (err) {
      setError(citizenErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
        <p className="text-sm text-gray-500">
          If an account exists for {email}, we sent a password reset link.
        </p>
        <Link href={`${base}/sign-in`} className="text-sm text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Forgot password</h1>
        <p className="text-sm text-gray-500 mt-1">We&apos;ll send you a reset link.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-sm text-center">
        <Link href={`${base}/sign-in`} className="text-blue-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}
