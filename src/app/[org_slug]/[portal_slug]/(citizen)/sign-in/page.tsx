'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCitizenAuth } from '@/context/CitizenAuthContext'
import { citizenErrorMessage, CitizenApiError } from '@/lib/citizenApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClientSignInPage() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const { signIn } = useCitizenAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.push(`${base}/dashboard`)
    } catch (err) {
      if ((err as CitizenApiError).status === 403) {
        setError('Your email is not verified. Please check your inbox.')
      } else {
        setError(citizenErrorMessage(err, 'Sign in failed. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="text-sm text-gray-500 mt-1">Access your requests.</p>
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
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="text-sm text-center space-y-2">
        <p>
          <Link href={`${base}/forgot-password`} className="text-blue-600 hover:underline">
            Forgot your password?
          </Link>
        </p>
        <p className="text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href={`${base}/sign-up`} className="text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
