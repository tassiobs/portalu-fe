'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CitizenAuthProvider, useCitizenAuth } from '@/context/CitizenAuthContext'

function Header({ orgSlug, portalSlug }: { orgSlug: string; portalSlug: string }) {
  const { client, signOut } = useCitizenAuth()
  const router = useRouter()
  const base = `/${orgSlug}/${portalSlug}`

  async function handleSignOut() {
    await signOut()
    router.push(`${base}/sign-in`)
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href={base} className="text-lg font-semibold text-gray-900 capitalize">
          {portalSlug.replace(/-/g, ' ')}
        </Link>
        <div className="flex items-center gap-3">
          {client ? (
            <>
              <Link href={`${base}/dashboard`} className="text-sm text-gray-600 hover:text-gray-900">
                My requests
              </Link>
              <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href={`${base}/sign-in`} className="text-sm text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link
                href={`${base}/sign-up`}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const orgSlug = decodeURIComponent(org_slug ?? '')
  const portalSlug = decodeURIComponent(portal_slug ?? '')

  return (
    <CitizenAuthProvider orgSlug={orgSlug} portalSlug={portalSlug}>
      <div className="min-h-screen bg-gray-50">
        <Header orgSlug={orgSlug} portalSlug={portalSlug} />
        <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
      </div>
    </CitizenAuthProvider>
  )
}
