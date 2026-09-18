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
  email: z.string().email('Invalid email address'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      setSent(true)
    } catch (err) {
      const apiErr = err as ApiError
      const msg = (apiErr.body as { message?: string })?.message || 'Something went wrong'
      setServerError(msg)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 font-medium text-lg">Check your email</div>
        <p className="text-gray-600 text-sm">
          If that email exists, you&apos;ll receive a reset link shortly.
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
        <h1 className="text-xl font-semibold text-gray-900">Forgot password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/sign-in" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
