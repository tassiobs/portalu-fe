'use client'

export function PageGuard({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed)
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        You don&apos;t have permission to view this page.
      </div>
    )
  return <>{children}</>
}
