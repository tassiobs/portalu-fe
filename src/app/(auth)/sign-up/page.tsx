'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { apiFetch, ApiError } from '@/lib/api'
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
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await apiFetch('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      setSuccess(true)
    } catch (err) {
      const apiErr = err as ApiError
      const msg =
        (apiErr.body as { message?: string })?.message || 'Something went wrong'
      setServerError(msg)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 font-medium text-lg">Check your email</div>
        <p className="text-gray-600 text-sm">
          We sent a verification link to your email. Please verify your account before signing in.
        </p>
        <Link href="/sign-in" className="text-blue-600 hover:underline text-sm">
          Back to sign in
        </Link>
      </div>
    )
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
