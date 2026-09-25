'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { citizenFetch, citizenErrorMessage } from '@/lib/citizenApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClientSignUpPage() {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')
  const base = `/${orgSlug}/${portalSlug}`
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await citizenFetch(orgSlug, portalSlug, '/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      router.push(`${base}/verify-email?email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      setError(citizenErrorMessage(err, 'Could not create account. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">Submit and track your requests.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !name.trim() || !email.trim() || !password}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500">
        Already have an account?{' '}
        <Link href={`${base}/sign-in`} className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
