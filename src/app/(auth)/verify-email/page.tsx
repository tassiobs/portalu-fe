'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setErrorMessage('No verification token provided.')
      setStatus('error')
      return
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus('success'))
      .catch((err: ApiError) => {
        const msg = (err.body as { message?: string })?.message || 'Verification failed.'
        setErrorMessage(msg)
        setStatus('error')
      })
  }, [token])

  if (status === 'loading') return <LoadingSpinner />

  if (status === 'success') {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 font-medium text-lg">Email verified!</div>
        <p className="text-gray-600 text-sm">Your email has been verified. You can now sign in.</p>
        <Link href="/sign-in" className="text-blue-600 hover:underline text-sm">
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-red-600 font-medium text-lg">Verification failed</div>
      <p className="text-gray-600 text-sm">{errorMessage}</p>
      <Link href="/sign-in" className="text-blue-600 hover:underline text-sm">
        Back to sign in
      </Link>
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
