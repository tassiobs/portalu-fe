'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiFetch, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const schema = z
  .object({
    name: z.string().min(1, 'Full name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    if (!token) {
      setServerError('Missing invite token.')
      return
    }
    setServerError(null)
    try {
      await apiFetch('/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, name: data.name, password: data.password }),
      })
      router.push('/sign-in?invited=1')
    } catch (err) {
      const apiErr = err as ApiError
      const body = apiErr.body as { message?: string; detail?: string }
      const msg = body?.message || body?.detail || 'Something went wrong'
      setServerError(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Accept invitation</h1>
        <p className="text-sm text-gray-500 mt-1">Set up your account to join the organization.</p>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...register('name')} placeholder="Jane Smith" />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} placeholder="Min. 8 characters" />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" {...register('confirm')} placeholder="Repeat password" />
        {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Setting up account…' : 'Accept invitation'}
      </Button>
    </form>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AcceptInviteContent />
    </Suspense>
  )
}
