import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // OAuth / magic-link flow — exchange short-lived code for a session
  const code = requestUrl.searchParams.get('code')
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(`${origin}${next}`)
  }

  // PKCE email-confirmation flow — Supabase sends token_hash + type
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as any
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Verification failed — send back to login with an error hint
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
