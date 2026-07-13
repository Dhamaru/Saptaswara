import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Runs on every non-static request. Refreshes the Supabase session cookie so
 * access tokens are rotated before they expire (~1 hour), preventing silent
 * 401s on protected API routes. Route protection (redirect to /login) is
 * handled inside updateSession.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets. Run on all other routes.
    '/((?!_next/static|_next/image|favicon.ico|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
