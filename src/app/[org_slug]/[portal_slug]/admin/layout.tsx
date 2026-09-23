'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePortalAdmin } from '@/hooks/usePortalAdmin'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function PortalAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { org_slug, portal_slug } = useParams<{ org_slug: string; portal_slug: string }>()
  const { portal, isLoading: portalLoading } = usePortalAdmin()

  const base = `/${org_slug}/${portal_slug}/admin`

  const navItems = [
    { label: 'Overview', href: base },
    { label: 'Request Types', href: `${base}/request-types` },
    { label: 'Requests', href: `${base}/requests` },
    { label: 'Users', href: `${base}/users` },
    { label: 'Settings', href: `${base}/settings` },
  ]

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  if (loading || portalLoading) return <LoadingSpinner />
  if (!user) return null

  if (portal === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-gray-500 text-sm">Portal not found.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to portals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-10">
        <div className="px-6 py-5 border-b border-gray-100">
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← All portals
          </Link>
          <p className="text-base font-semibold text-gray-900 mt-1 truncate">
            {portal?.name ?? '…'}
          </p>
          <span className="text-xs text-blue-500 font-medium">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === base ? pathname === base : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  )
}
