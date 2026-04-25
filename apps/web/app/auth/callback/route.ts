import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Build the redirect response first so we can attach session cookies to it.
  // Using NextResponse.redirect() and then calling cookies() on the server
  // client separately means the session is never sent to the browser — the
  // two response objects are distinct. Writing cookies directly onto this
  // response object fixes that.
  const redirectTo = (path: string) => NextResponse.redirect(`${origin}${path}`)
  const successResponse = redirectTo(next)
  const failureResponse = redirectTo('/login?error=confirmation_failed')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // PKCE code exchange — used by OAuth, magic links, and newer Supabase flows
  const code = requestUrl.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? failureResponse : successResponse
  }

  // token_hash flow — used by email confirmation and password recovery
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as any
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    return error ? failureResponse : successResponse
  }

  return successResponse
}
