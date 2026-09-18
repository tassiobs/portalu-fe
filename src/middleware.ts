import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Refresh token lives in localStorage (client-only) so we can't check it in middleware.
  // We rely on the AuthContext/rehydrate to handle redirects on the client.
  // Middleware only redirects the root path for cleanliness.
  void PUBLIC_PATHS // kept for reference
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|favicon.ico|api).*)'] }
