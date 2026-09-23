'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { apiFetch, ApiError } from '@/lib/api'
import { signIn } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  org_name: z.string().min(1, 'Organization name is required'),
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function SignUpPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  const { refresh } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const res = await apiFetch<{ verification_token?: string }>('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (res?.verification_token) {
        try {
          await apiFetch('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token: res.verification_token }),
          })
        } catch {
          // Backend may still have verified the email in DB before erroring — proceed to sign-in
        }
      }
      await signIn(data.email, data.password)
      await refresh()
      router.push('/dashboard')
    } catch (err) {
      const apiErr = err as ApiError
      const body = apiErr.body as { message?: string; detail?: string } | null
      const raw = body?.message ?? body?.detail ?? 'Something went wrong'
      const msg =
        raw === 'Email already registered'
          ? 'This email is already registered. If you just signed up, there may be a temporary issue — please try signing in instead.'
          : raw
      setServerError(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start your organization on Portalu</p>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="org_name">Organization name</Label>
        <Input id="org_name" {...register('org_name')} placeholder="Acme Corp" />
        {errors.org_name && <p className="text-xs text-red-600">{errors.org_name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...register('name')} placeholder="Jane Smith" />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} placeholder="Min. 8 characters" />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
