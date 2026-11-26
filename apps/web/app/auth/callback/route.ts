import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// `next` comes from a query string and is appended to our own origin. Without
// validation, `//evil.example` or `https://evil.example` would turn the auth
// callback into an open redirect (and leak the freshly issued session code).
function safeNextPath(value: string | null): string {
  const fallback = '/dashboard'
  if (!value) return fallback

  // Root-relative only. Reject protocol-relative URLs and backslashes, which
  // browsers normalise to `//` and would therefore escape the origin.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback

  try {
    const parsed = new URL(value, 'http://localhost')
    if (parsed.origin !== 'http://localhost') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  const next = safeNextPath(requestUrl.searchParams.get('next'))

  // Build the redirect response first so we can attach session cookies to it.
  // Using NextResponse.redirect() and then calling cookies() on the server
  // client separately means the session is never sent to the browser — the
  // two response objects are distinct. Writing cookies directly onto this
  // response object fixes that.
  const redirectTo = (path: string) => NextResponse.redirect(`${origin}${path}`)
  const successResponse = redirectTo(next)
  const failureResponse = redirectTo('/login?error=confirmation_failed')

  let cookiesToSetList: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSetList = cookiesToSet
        },
      },
    },
  )

  let finalResponse: NextResponse | null = null

  // PKCE code exchange — used by OAuth, magic links, and newer Supabase flows
  const code = requestUrl.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    finalResponse = error ? failureResponse : successResponse
  }

  // token_hash flow — used by email confirmation and password recovery
  if (!finalResponse) {
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as any
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })
      finalResponse = error ? failureResponse : successResponse
    }
  }

  finalResponse = finalResponse || successResponse

  // Apply all cookies to the final response
  cookiesToSetList.forEach(({ name, value, options }) => {
    finalResponse!.cookies.set(name, value, options)
  })

  return finalResponse
}
