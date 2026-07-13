import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update request cookies so supabase client can see them in this request
          request.cookies.set({
            name,
            value,
            ...options,
          })
          
          // IMPORTANT: Re-create response but PRESERVE existing cookies that were set on the previous response
          // In Next.js middleware, each NextResponse.next() call creates a fresh response.
          // We need to make sure we don't lose cookies set in prior 'set' calls.
          const currentCookies = response.cookies.getAll()
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Restore previous cookies
          currentCookies.forEach(cookie => response.cookies.set(cookie))
          // Set the new cookie
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          const currentCookies = response.cookies.getAll()
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          currentCookies.forEach(cookie => response.cookies.set(cookie))
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let user = null
  let authNetworkError = false
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    // Network-level failure talking to Supabase auth — the session cookies may
    // still be valid. Don't redirect to login on a transient service error.
    console.error('[Middleware] Error getting user:', err)
    authNetworkError = true
  }

  // Route Protection Logic
  const protectedRoutes = ['/studio', '/dashboard', '/journal', '/workspace', '/projects']
  const pathname = request.nextUrl.pathname
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

  if (user) {
    console.log(`[Middleware] User authenticated: ${user.email} for ${pathname}`)
  } else {
    console.log(`[Middleware] No session for ${pathname}`)
  }

  // Only redirect when we definitively know there is no session.
  // If getUser() threw a network error, pass through — don't log the user out.
  if (isProtected && !user && !authNetworkError) {
    // Check for guest bypass in development, testing, or if explicitly requested via param
    const isGuestBypass = request.nextUrl.searchParams.get('guest') === 'true'

    if (!isGuestBypass) {
      console.log(`[Middleware] Redirecting to /login from protected route: ${pathname}`)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      // Preserve the intended destination
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.log(`[Middleware] Guest bypass active for ${pathname}`)
    }
  }

  return response
}
